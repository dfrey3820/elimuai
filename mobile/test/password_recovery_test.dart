import 'dart:convert';

import 'package:elimuai_mobile/api.dart';
import 'package:elimuai_mobile/password_recovery.dart';
import 'package:elimuai_mobile/ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));

  Future<void> start(WidgetTester tester, ElimuApi api) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(MaterialApp(theme: appTheme(false), home: Builder(builder: (context) => Scaffold(
      body: TextButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PasswordRecovery(api: api))),
        child: const Text('Sign in screen')),
    ))));
    await tester.tap(find.text('Sign in screen'));
    await tester.pumpAndSettle();
  }

  testWidgets('recovery sends email, verifies code, resets password and returns to sign in', (tester) async {
    final paths = <String>[];
    final api = ElimuApi(client: MockClient((request) async {
      paths.add(request.url.path);
      if (request.url.path.endsWith('forgot-password')) {
        expect(jsonDecode(request.body), {'email': 'learner@example.com'});
      } else {
        expect(jsonDecode(request.body), {'email': 'learner@example.com', 'code': '123456', 'new_password': 'replacement-password'});
      }
      return http.Response('{"success":true}', 200);
    }));
    await start(tester, api);
    await tester.enterText(find.byType(TextFormField), 'learner@example.com');
    await tester.tap(find.text('Send reset code'));
    await tester.pumpAndSettle();
    expect(find.text('Set a new password'), findsOneWidget);
    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), '123456');
    await tester.enterText(fields.at(1), 'replacement-password');
    await tester.enterText(fields.at(2), 'replacement-password');
    await tester.scrollUntilVisible(find.text('Update password'), 200, scrollable: find.byType(Scrollable).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Update password'));
    await tester.pumpAndSettle();
    expect(find.text('Password updated'), findsOneWidget);
    expect(paths, ['/api/auth/forgot-password', '/api/auth/reset-password']);
    await tester.tap(find.text('Back to sign in'));
    await tester.pumpAndSettle();
    expect(find.text('Sign in screen'), findsOneWidget);
  });

  testWidgets('missing recovery endpoint shows a truthful error without opening a browser', (tester) async {
    final api = ElimuApi(client: MockClient((_) async => http.Response('{"detail":"Not Found"}', 404)));
    await start(tester, api);
    await tester.enterText(find.byType(TextFormField), 'learner@example.com');
    await tester.tap(find.text('Send reset code'));
    await tester.pumpAndSettle();
    expect(find.text('Password recovery is not available on the server yet. Please try again later.'), findsOneWidget);
    expect(find.text('Set a new password'), findsNothing);
  });

  testWidgets('email validation prevents empty recovery requests', (tester) async {
    final api = ElimuApi(client: MockClient((_) async => throw StateError('Must not contact server')));
    await start(tester, api);
    await tester.tap(find.text('Send reset code'));
    await tester.pumpAndSettle();
    expect(find.text('Enter a valid email address.'), findsOneWidget);
  });

  testWidgets('mismatched passwords and rejected codes keep recovery on screen', (tester) async {
    var resets = 0;
    final api = ElimuApi(client: MockClient((request) async {
      if (request.url.path.endsWith('forgot-password')) return http.Response('{"success":true}', 200);
      resets++;
      return http.Response('{"detail":"Invalid or expired reset code. Please request a new code."}', 400);
    }));
    await start(tester, api);
    await tester.enterText(find.byType(TextFormField), 'learner@example.com');
    await tester.tap(find.text('Send reset code'));
    await tester.pumpAndSettle();
    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), '123456');
    await tester.enterText(fields.at(1), 'replacement-password');
    await tester.enterText(fields.at(2), 'a-different-password');
    await tester.scrollUntilVisible(find.text('Update password'), 200, scrollable: find.byType(Scrollable).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Update password'));
    await tester.pumpAndSettle();
    expect(find.text('Passwords do not match.'), findsOneWidget);
    expect(resets, 0);
    await tester.enterText(fields.at(2), 'replacement-password');
    await tester.ensureVisible(find.text('Update password'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Update password'));
    await tester.pumpAndSettle();
    expect(resets, 1);
    expect(find.text('Invalid or expired reset code. Please request a new code.'), findsOneWidget);
    expect(find.text('Password updated'), findsNothing);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
  });
}