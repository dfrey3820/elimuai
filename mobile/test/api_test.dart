import 'dart:convert';

import 'package:elimuai_mobile/api.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));

  test('login preserves the OTP challenge and sends expected credentials', () async {
    final api = ElimuApi(client: MockClient((request) async {
      expect(request.url.host, 'api.elimuai.africa');
      expect(request.url.path, '/api/auth/login');
      expect(jsonDecode(request.body), {'identifier': 'learner@example.com', 'password': 'password'});
      return http.Response('{"requiresOTP":true,"email":"learner@example.com","purpose":"login"}', 200);
    }));
    expect((await api.login(' learner@example.com ', 'password'))['requiresOTP'], true);
    expect(api.hasSession, false);
  });

  test('verification saves a session and restore recovers it', () async {
    final api = ElimuApi(client: MockClient((request) async {
      expect(jsonDecode(request.body)['code'], '123456');
      return http.Response('{"accessToken":"access","refreshToken":"refresh","verified":true}', 200);
    }));
    await api.verify('learner@example.com', '123456', 'login');
    final restored = ElimuApi();
    await restored.restore();
    expect(restored.hasSession, true);
    await restored.clearSession();
    expect(restored.hasSession, false);
  });

  test('expired access token refreshes and retries with the new bearer', () async {
    var calls = 0;
    final api = ElimuApi(client: MockClient((request) async {
      if (request.url.path == '/api/auth/refresh') {
        expect(jsonDecode(request.body)['refreshToken'], 'refresh');
        return http.Response('{"accessToken":"new","refreshToken":"rotated"}', 200);
      }
      calls++;
      return request.headers['Authorization'] == 'Bearer new'
          ? http.Response('{"subjects":[]}', 200) : http.Response('{}', 401);
    }));
    await api.saveSession({'accessToken': 'expired', 'refreshToken': 'refresh'});
    expect((await api.get('/api/curriculum/subjects'))['subjects'], isEmpty);
    expect(calls, 2);
  });

  test('payment restriction is surfaced without fabricating a reply', () async {
    final api = ElimuApi(client: MockClient((_) async => http.Response('{}', 402)));
    await expectLater(api.post('/api/ai/tutor', {}), throwsA(isA<ApiException>()
        .having((error) => error.status, 'status', 402)));
  });

  test('rejects insecure production API configuration', () async {
    final api = ElimuApi(baseUrl: 'http://example.com');
    await expectLater(api.get('/api/auth/me'), throwsA(isA<ApiException>()));
  });

  test('HTML login response identifies a misconfigured API origin', () async {
    final api = ElimuApi(client: MockClient((_) async => http.Response(
      '<!DOCTYPE html><html><body>ElimuAI website</body></html>', 200,
      headers: {'content-type': 'text/html'},
    )));
    await expectLater(api.login('learner@example.com', 'test-password'), throwsA(isA<ApiException>()
      .having((error) => error.message, 'message', contains('API_BASE_URL'))));
  });

  test('protected auth screens refresh expired access tokens', () async {
    final api = ElimuApi(client: MockClient((request) async {
      if (request.url.path == '/api/auth/refresh') {
        return http.Response('{"accessToken":"new-access","refreshToken":"new-refresh"}', 200);
      }
      expect(request.url.path, '/api/auth/me');
      return request.headers['Authorization'] == 'Bearer new-access'
        ? http.Response('{"user":{"id":"learner"}}', 200) : http.Response('{}', 401);
    }));
    await api.saveSession({'accessToken': 'expired', 'refreshToken': 'refresh'});
    expect((await api.get('/api/auth/me'))['user']['id'], 'learner');
  });
}