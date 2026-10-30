import 'dart:convert';

import 'package:elimuai_mobile/api.dart';
import 'package:elimuai_mobile/photo_scan.dart';
import 'package:elimuai_mobile/study.dart';
import 'package:elimuai_mobile/ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MemoryPhoto extends XFile {
  MemoryPhoto(this.bytes) : super('homework.jpg');
  final Uint8List bytes;
  @override
  Future<int> length() async => bytes.length;
  @override
  Future<Uint8List> readAsBytes() async => bytes;
}

class TestPhotoPicker extends ImagePicker {
  TestPhotoPicker(this.bytes, {this.denied = false});
  final Uint8List bytes;
  final bool denied;
  ImageSource? source;

  @override
  Future<LostDataResponse> retrieveLostData() async => LostDataResponse.empty();

  @override
  Future<XFile?> pickImage({required ImageSource source, double? maxWidth,
      double? maxHeight, int? imageQuality, CameraDevice preferredCameraDevice = CameraDevice.rear,
      bool requestFullMetadata = true}) async {
    this.source = source;
    if (denied) throw PlatformException(code: 'camera_access_denied');
    return MemoryPhoto(bytes);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
  });

  Future<Study> account(http.Client client) async {
    final api = ElimuApi(client: client);
    final study = Study(api);
    await study.initialize();
    await api.saveSession({'accessToken': 'access', 'refreshToken': 'refresh'});
    study.user = {'id': 'student', 'role': 'student'};
    study.subjects = demoSubjects;
    return study;
  }

  testWidgets('a subscription is required before camera controls appear', (tester) async {
    final study = await account(MockClient((_) async => http.Response('{"aiEnabled":false}', 200)));
    await tester.pumpWidget(MaterialApp(theme: appTheme(false), home: PhotoScanPage(study: study)));
    await tester.pumpAndSettle();
    expect(find.text('An active subscription is required for Photo Scan.'), findsOneWidget);
    expect(find.text('Take photo'), findsNothing);
    expect(find.text('Choose photo'), findsNothing);
    expect(find.text('View my plan'), findsOneWidget);
  });

  for (final source in [ImageSource.camera, ImageSource.gallery]) {
    testWidgets('${source.name} photo produces an answer on a small phone', (tester) async {
      tester.view.physicalSize = const Size(320, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final bytes = (await rootBundle.load('assets/images/teacher.jpg')).buffer.asUint8List();
      final picker = TestPhotoPicker(bytes);
      var uploaded = false;
      var entitlementChecks = 0;
      final study = await account(MockClient((request) async {
        if (request.url.path.endsWith('subscription-status')) {
          entitlementChecks++;
          return http.Response('{"aiEnabled":true,"source":"personal"}', 200);
        }
        uploaded = true;
        expect(base64Decode(jsonDecode(request.body)['imageB64']), bytes);
        return http.Response('data: {"text":"The answer is **3/4**."}\n\ndata: [DONE]\n\n',
          200, headers: {'content-type': 'text/event-stream'});
      }));
      await tester.pumpWidget(MaterialApp(theme: appTheme(false), home: PhotoScanPage(study: study, picker: picker)));
      await tester.pumpAndSettle();
      final button = find.text(source == ImageSource.camera ? 'Take photo' : 'Choose photo');
      await tester.scrollUntilVisible(button, 150, scrollable: find.byType(Scrollable).first);
      await tester.pumpAndSettle();
      await tester.tap(button);
      await tester.pumpAndSettle();
      expect(picker.source, source);
      await tester.scrollUntilVisible(find.text('Get answer'), 250, scrollable: find.byType(Scrollable).first);
      await tester.pumpAndSettle();
      await tester.runAsync(() async {
        await tester.tap(find.text('Get answer'));
        await Future<void>.delayed(Duration.zero);
      });
      await tester.pumpAndSettle();
      expect(uploaded, true);
      expect(entitlementChecks, 2);
      await tester.scrollUntilVisible(find.text('Your answer'), 250, scrollable: find.byType(Scrollable).first);
      await tester.pumpAndSettle();
      expect(find.text('Your answer'), findsOneWidget);
      expect(find.byTooltip('Copy answer'), findsOneWidget);
    });
  }

  testWidgets('permission denial is reported without uploading', (tester) async {
    final picker = TestPhotoPicker(Uint8List(0), denied: true);
    final study = await account(MockClient((request) async {
      expect(request.url.path, '/api/payments/subscription-status');
      return http.Response('{"aiEnabled":true}', 200);
    }));
    await tester.pumpWidget(MaterialApp(theme: appTheme(false), home: PhotoScanPage(study: study, picker: picker)));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Take photo'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Take photo'));
    await tester.pumpAndSettle();
    expect(find.text('Camera or photo access is disabled. Allow access in your device settings.'), findsOneWidget);
  });
}