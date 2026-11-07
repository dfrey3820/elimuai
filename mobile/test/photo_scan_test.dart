import 'dart:convert';
import 'dart:typed_data';

import 'package:elimuai_mobile/api.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));
  final image = Uint8List.fromList(List.filled(32, 1));

  Future<ElimuApi> apiWith(http.Client client) async {
    final api = ElimuApi(client: client);
    await api.saveSession({'accessToken': 'test-access', 'refreshToken': 'test-refresh'});
    return api;
  }

  test('subscription denial prevents any image upload', () async {
    var requests = 0;
    final api = await apiWith(MockClient((request) async {
      requests++;
      expect(request.url.path, '/api/payments/subscription-status');
      return http.Response('{"aiEnabled":false}', 200);
    }));
    await expectLater(api.scanPhoto(image, mimeType: 'image/jpeg', subject: 'Mathematics'),
      emitsError(isA<ApiException>().having((error) => error.status, 'status', 402)));
    expect(requests, 1);
  });

  test('an eligible account sends the photo and receives streamed answers', () async {
    final api = await apiWith(MockClient((request) async {
      if (request.url.path.endsWith('subscription-status')) return http.Response('{"aiEnabled":true,"source":"school"}', 200);
      expect(request.url.path, '/api/ai/photoscan/analyse');
      expect(request.headers['Authorization'], 'Bearer test-access');
      final body = jsonDecode(request.body);
      expect(base64Decode(body['imageB64']), image);
      expect(body['mimeType'], 'image/jpeg');
      expect(body['mode'], 'ask');
      expect(body['subject'], 'Mathematics');
      return http.Response('data: {"text":"First, "}\n\ndata: {"text":"add the fractions."}\n\ndata: [DONE]\n\n',
        200, headers: {'content-type': 'text/event-stream'});
    }));
    expect(await api.scanPhoto(image, mimeType: 'image/jpeg', subject: 'Mathematics').toList(),
      ['First, ', 'First, add the fractions.']);
  });

  test('server subscription rejection remains authoritative after preflight', () async {
    final api = await apiWith(MockClient((request) async => request.url.path.endsWith('subscription-status')
      ? http.Response('{"aiEnabled":true}', 200) : http.Response('{"detail":"Subscription expired"}', 402)));
    await expectLater(api.scanPhoto(image, mimeType: 'image/png', subject: 'English'),
      emitsError(isA<ApiException>().having((error) => error.status, 'status', 402)));
  });

  test('an interrupted stream is not presented as a complete answer', () async {
    final api = await apiWith(MockClient((request) async => request.url.path.endsWith('subscription-status')
      ? http.Response('{"aiEnabled":true}', 200)
      : http.Response('data: {"text":"Partial answer"}\n\n', 200, headers: {'content-type': 'text/event-stream'})));
    await expectLater(api.scanPhoto(image, mimeType: 'image/jpeg', subject: 'Mathematics'),
      emitsInOrder(['Partial answer', emitsError(isA<ApiException>())]));
  });

  test('large photos are rejected before contacting the API', () async {
    final api = await apiWith(MockClient((_) async => throw StateError('Must not contact server')));
    await expectLater(api.scanPhoto(Uint8List(5 * 1024 * 1024 + 1), mimeType: 'image/jpeg', subject: 'Mathematics'),
      emitsError(isA<ApiException>()));
  });
}