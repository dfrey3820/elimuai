import 'package:elimuai_mobile/api.dart';
import 'package:elimuai_mobile/main.dart';
import 'package:elimuai_mobile/screens.dart';
import 'package:elimuai_mobile/study.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
  });

  Future<Study> openApp(WidgetTester tester, Size size) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final study = Study(ElimuApi());
    await tester.pumpWidget(ElimuApp(study: study));
    await tester.pumpAndSettle();
    return study;
  }

  testWidgets('password form validates without making a network request', (tester) async {
    await openApp(tester, const Size(390, 844));
    await tester.ensureVisible(find.text('Sign in'));
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();
    expect(find.text('Enter your email or phone.'), findsOneWidget);
    expect(find.text('Enter your password.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('forgot password opens a native recovery screen', (tester) async {
    await openApp(tester, const Size(390, 844));
    await tester.scrollUntilVisible(find.text('Forgot password?'), 200,
      scrollable: find.byType(Scrollable).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Forgot password?'));
    await tester.pumpAndSettle();
    expect(find.text('Reset your password'), findsOneWidget);
    expect(find.text('Email address'), findsOneWidget);
  });

  for (final size in [const Size(320, 700), const Size(430, 932), const Size(1024, 768)]) {
    testWidgets('demo navigation and reading fit ${size.width}', (tester) async {
      final study = await openApp(tester, size);
      await tester.scrollUntilVisible(find.text('Explore a demo'), 250,
        scrollable: find.byType(Scrollable).first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Explore a demo'));
      await tester.pumpAndSettle();
      expect(find.text('Your next chapter, Alex.'), findsOneWidget);
      await tester.tap(find.text('Learn'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Making sense of fractions').first);
      await tester.pumpAndSettle();
      expect(find.text('Your reading space'), findsOneWidget);
      await tester.tap(find.byTooltip('Save offline'));
      await tester.pumpAndSettle();
      expect(study.saved.single.id, 'demo-fractions');
      expect(find.text('Available offline'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Mark as read'), 400,
        scrollable: find.descendant(of: find.byType(LessonReader), matching: find.byType(Scrollable)).first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Mark as read'));
      await tester.pumpAndSettle();
      expect(study.completed, contains('demo-fractions'));
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.tap(find.text('Saved'));
      await tester.pumpAndSettle();
      expect(find.text('Your pocket library.'), findsOneWidget);
      await tester.tap(find.text('Tutor'));
      await tester.pumpAndSettle();
      expect(find.text('Demo preview. Sign in to ask the live AI tutor.'), findsOneWidget);
    });
  }
}