import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  const ApiException(this.message, [this.status]);
  final String message;
  final int? status;
  @override
  String toString() => message;
}

class ElimuApi {
  ElimuApi({http.Client? client, FlutterSecureStorage? storage, String? baseUrl})
    : client = client ?? http.Client(),
      storage = storage ?? const FlutterSecureStorage(),
      baseUrl = baseUrl ?? const String.fromEnvironment(
        'API_BASE_URL', defaultValue: 'https://api.elimuai.africa',
      );

  final http.Client client;
  final FlutterSecureStorage storage;
  final String baseUrl;
  String? _accessToken;
  String? _refreshToken;
  Future<void>? _refreshing;
  bool get hasSession => _accessToken != null;

  Future<void> restore() async {
    final saved = await storage.read(key: 'elimu.session');
    if (saved == null) return;
    try {
      final data = jsonDecode(saved) as Map<String, dynamic>;
      _accessToken = data['accessToken'] as String?;
      _refreshToken = data['refreshToken'] as String?;
    } on FormatException {
      await clearSession();
    }
  }

  Future<void> saveSession(Map<String, dynamic> data) async {
    final access = data['accessToken'] ?? data['access_token'];
    final refresh = data['refreshToken'] ?? data['refresh_token'];
    if (access is! String || access.isEmpty) {
      throw const ApiException('Sign-in did not return a valid session.');
    }
    await storage.write(key: 'elimu.session', value: jsonEncode({
      'accessToken': access, 'refreshToken': refresh,
    }));
    _accessToken = access;
    _refreshToken = refresh as String?;
  }

  Future<void> clearSession() async {
    _accessToken = null;
    _refreshToken = null;
    await storage.delete(key: 'elimu.session');
  }

  Future<Map<String, dynamic>> get(String path, [Map<String, String>? query]) =>
      _request('GET', path, query: query);

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) =>
      _request('POST', path, body: body);

  Future<Map<String, dynamic>> send(String method, String path,
      [Map<String, dynamic>? body]) {
    if (!const {'GET', 'POST', 'PUT', 'PATCH', 'DELETE'}.contains(method)) {
      throw ArgumentError.value(method, 'method');
    }
    return _request(method, path, body: body);
  }

  Future<bool> photoScanEnabled() async {
    final status = await get('/api/payments/subscription-status');
    return status['aiEnabled'] == true;
  }

  Stream<String> scanPhoto(Uint8List image, {required String mimeType,
      required String subject, String mode = 'ask'}) async* {
    if (!hasSession) {
      throw const ApiException('Please sign in to use Photo Scan.', 401);
    }
    if (image.isEmpty || image.length > 5 * 1024 * 1024) {
      throw const ApiException('Choose a photo smaller than 5 MB.');
    }
    if (!const {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}.contains(mimeType)) {
      throw const ApiException('Choose a JPEG, PNG, WebP, or GIF photo.');
    }
    if (!await photoScanEnabled()) {
      throw const ApiException('An active subscription is required for Photo Scan.', 402);
    }
    final body = {'imageB64': base64Encode(image), 'mimeType': mimeType,
      'subject': subject, 'mode': mode};
    yield* _scanStream(body);
  }

  Stream<String> _scanStream(Map<String, dynamic> body, {bool retry = true}) async* {
    final base = Uri.parse(baseUrl);
    if (base.scheme != 'https' &&
        !(base.scheme == 'http' && const bool.fromEnvironment('ALLOW_HTTP'))) {
      throw const ApiException('Use an HTTPS API address.');
    }
    final request = http.Request('POST', base.resolve('/api/ai/photoscan/analyse'))
      ..headers.addAll({'Content-Type': 'application/json', 'Accept': 'text/event-stream',
        if (_accessToken != null) 'Authorization': 'Bearer $_accessToken'})
      ..body = jsonEncode(body);
    try {
      final response = await client.send(request).timeout(const Duration(seconds: 60));
      if (response.statusCode == 401 && retry && _refreshToken != null) {
        await response.stream.drain<void>();
        try {
          await (_refreshing ??= _refresh());
        } finally {
          _refreshing = null;
        }
        yield* _scanStream(body, retry: false);
        return;
      }
      if (response.statusCode >= 400) {
        final responseBody = await response.stream.bytesToString().timeout(const Duration(seconds: 30));
        String? detail;
        try {
          final parsed = jsonDecode(responseBody);
          if (parsed is Map && parsed['detail'] is String) detail = parsed['detail'];
        } on FormatException {
          detail = null;
        }
        throw ApiException(detail ?? (response.statusCode == 402
          ? 'An active subscription is required for Photo Scan.'
          : 'Photo Scan failed (${response.statusCode}). Please try again.'), response.statusCode);
      }
      if (!(response.headers['content-type'] ?? '').contains('text/event-stream')) {
        await response.stream.drain<void>();
        throw const ApiException('The server did not return a Photo Scan stream.');
      }
      var answer = '';
      await for (final line in response.stream.transform(utf8.decoder)
          .transform(const LineSplitter()).timeout(const Duration(seconds: 90))) {
        if (!line.startsWith('data:')) continue;
        final payload = line.substring(5).trim();
        if (payload == '[DONE]') {
          if (answer.trim().isEmpty) {
            throw const ApiException('No answer was returned. Please try another photo.');
          }
          return;
        }
        final event = jsonDecode(payload);
        if (event is! Map) throw const ApiException('The scan response could not be read.');
        if (event['error'] != null) throw ApiException('${event['error']}');
        if (event['text'] is String) {
          answer += event['text'] as String;
          yield answer;
        }
      }
      throw const ApiException('The answer was interrupted. Please try again.');
    } on TimeoutException {
      throw const ApiException('Photo Scan timed out. Check your connection and try again.');
    } on http.ClientException {
      throw const ApiException('Cannot connect. Check your internet connection.');
    } on FormatException {
      throw const ApiException('The scan response could not be read. Please try again.');
    }
  }

  Future<void> _refresh() async {
    try {
      final data = await _request('POST', '/api/auth/refresh',
        body: {'refreshToken': _refreshToken}, retry: false);
      await saveSession(data);
    } on ApiException catch (error) {
      if (error.status == 401 || error.status == 403) await clearSession();
      rethrow;
    }
  }

  Future<Map<String, dynamic>> _request(String method, String path, {
    Map<String, dynamic>? body, Map<String, String>? query, bool retry = true,
  }) async {
    final base = Uri.parse(baseUrl);
    if (base.scheme != 'https' &&
        !(base.scheme == 'http' && const bool.fromEnvironment('ALLOW_HTTP'))) {
      throw const ApiException('Use an HTTPS API address.');
    }
    final uri = base.resolve(path).replace(queryParameters: query);
    final request = http.Request(method, uri);
    request.headers['Content-Type'] = 'application/json';
    request.headers['Accept'] = 'application/json';
    if (_accessToken != null) {
      request.headers['Authorization'] = 'Bearer $_accessToken';
    }
    if (body != null) request.body = jsonEncode(body);
    late http.Response response;
    try {
      response = await http.Response.fromStream(await client.send(request))
          .timeout(const Duration(seconds: 60));
    } on TimeoutException {
      throw const ApiException('The connection timed out. Please try again.');
    } on http.ClientException {
      throw const ApiException('Cannot connect. Check your internet connection.');
    }
    const credentialEndpoints = {
      '/api/auth/login', '/api/auth/register', '/api/auth/refresh',
      '/api/auth/verify-otp', '/api/auth/resend-otp', '/api/auth/forgot-password',
      '/api/auth/reset-password', '/api/auth/change-password', '/api/auth/account',
    };
    if (response.statusCode == 401 && retry && _refreshToken != null &&
        !credentialEndpoints.contains(path)) {
      try {
        await (_refreshing ??= _refresh());
      } finally {
        _refreshing = null;
      }
      return _request(method, path, body: body, query: query, retry: false);
    }
    Map<String, dynamic> data = {};
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) data = decoded;
    } on FormatException {
      if (response.statusCode < 400) {
        if ((response.headers['content-type'] ?? '').contains('text/html')) {
          throw const ApiException('The server returned a website instead of the API. Check API_BASE_URL.');
        }
        throw const ApiException('The server returned an unexpected response.');
      }
    }
    if (response.statusCode >= 400) {
      final detail = data['error'] ?? data['detail'] ?? data['message'];
      final message = detail is String ? detail
        : response.statusCode == 402 ? 'An active subscription is needed for the AI tutor.'
        : response.statusCode == 401 ? 'Your session has expired. Please sign in again.'
        : 'Request failed (${response.statusCode}). Please try again.';
      throw ApiException(message, response.statusCode);
    }
    return data;
  }

  Future<Map<String, dynamic>> login(String identifier, String password) =>
      post('/api/auth/login', {'identifier': identifier.trim(), 'password': password});

  Future<Map<String, dynamic>> verify(String email, String code, String purpose) async {
    final data = await post('/api/auth/verify-otp', {
      'email': email, 'code': code, 'purpose': purpose,
    });
    await saveSession(data);
    return data;
  }

  Future<void> logout() async {
    try {
      if (hasSession) await post('/api/auth/logout', {'refresh_token': _refreshToken});
    } finally {
      await clearSession();
    }
  }

  void dispose() => client.close();
}