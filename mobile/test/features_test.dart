import 'dart:convert';

import 'package:elimuai_mobile/api.dart';
import 'package:elimuai_mobile/features.dart';
import 'package:elimuai_mobile/feature_views.dart';
import 'package:elimuai_mobile/study.dart';
import 'package:elimuai_mobile/ui.dart';
import 'package:elimuai_mobile/workspace.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
  });
  test('role catalog does not expose staff or platform tools to families', () async {
    final study = Study(ElimuApi());
    await study.initialize();
    study.enterDemo('parent');
    final ids = featuresFor(study).map((feature) => feature.id);
    expect(ids, contains('children'));
    expect(ids, isNot(contains('students')));
    expect(ids, isNot(contains('users')));
    study.enterDemo('teacher');
    expect(featuresFor(study).map((feature) => feature.id), containsAll(['classes', 'students', 'lessons']));
    expect(featuresFor(study).map((feature) => feature.id), isNot(contains('teachers')));
    study.enterDemo('admin');
    expect(featuresFor(study).map((feature) => feature.id), containsAll(['school', 'teachers']));
    expect(featuresFor(study).map((feature) => feature.id), isNot(contains('users')));
  });
  test('onboarding payload wraps people in the API bulk contract', () {
    final student = features.firstWhere((feature) => feature.id == 'students');
    expect(student.payload({'name': 'Alex', 'email': 'alex@example.com'}), {
      'students': [{'name': 'Alex', 'email': 'alex@example.com'}],
    });
  });

  for (final role in ['student', 'parent', 'teacher', 'admin', 'super_admin']) {
    testWidgets('$role tools all open native screens at small-phone width', (tester) async {
      tester.view.physicalSize = const Size(320, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final study = Study(ElimuApi());
      await study.initialize();
      study.enterDemo(role);
      for (final feature in featuresFor(study).where((feature) => feature.id != 'delete-account')) {
        await tester.pumpWidget(MaterialApp(key: ValueKey('$role-${feature.id}'), theme: appTheme(false),
          home: Builder(builder: (context) => Scaffold(body: TextButton(
            onPressed: () => openFeature(context, study, feature), child: const Text('Open tool'))))));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Open tool'));
        await tester.pumpAndSettle();
        expect(find.text('Open tool'), findsNothing, reason: '$role/${feature.id} must open inside the app');
        expect(tester.takeException(), isNull, reason: '$role/${feature.id} must fit the screen');
        await tester.pageBack();
        await tester.pumpAndSettle();
        expect(find.text('Open tool'), findsOneWidget);
      }
    });
  }

  testWidgets('native forms preserve exact password characters', (tester) async {
    final study = Study(ElimuApi());
    await study.initialize();
    Map<String, dynamic>? sent;
    await tester.pumpWidget(MaterialApp(theme: appTheme(false), home: Builder(builder: (context) => Scaffold(
      body: TextButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => NativeForm(
        study: study, title: 'Change password', fields: const [
          FormFieldSpec('password', 'Password', required: true, secret: true),
        ], submit: (values) async { sent = values; return {'success': true}; },
      ))), child: const Text('Open form')),
    ))));
    await tester.tap(find.text('Open form'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField), '  a secure password  ');
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(sent?['password'], '  a secure password  ');
  });

  for (final (role, id, fields, createPath, key) in [
    ('parent', 'children', ['Amani', 'amani@example.com', '', 'Grade 7'], '/api/users/onboard-child', 'children'),
    ('teacher', 'classes', ['Acacia', 'Grade 7', 'Mathematics'], '/api/onboarding/classes', 'classes'),
  ]) {
    testWidgets('$role can create a $id record through the native form', (tester) async {
      Map<String, dynamic>? sent;
      final api = ElimuApi(client: MockClient((request) async {
        if (request.method == 'POST') {
          expect(request.url.path, createPath);
          sent = Map<String, dynamic>.from(jsonDecode(request.body));
          return http.Response('{"message":"Created"}', 201);
        }
        return http.Response(jsonEncode({key: []}), 200);
      }));
      final study = Study(api);
      await study.initialize();
      study.user = {'id': 'test-user', 'role': role};
      final feature = features.firstWhere((feature) => feature.id == id);
      await tester.pumpWidget(MaterialApp(theme: appTheme(false), home: FeaturePage(study: study, feature: feature)));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Add'));
      await tester.pumpAndSettle();
      for (final (index, text) in fields.indexed) {
        await tester.enterText(find.byType(TextFormField).at(index), text);
      }
      await tester.scrollUntilVisible(find.text('Save'), 200, scrollable: find.byType(Scrollable).first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Save'));
      await tester.pumpAndSettle();
      expect(sent?['name'], fields.first);
      expect(sent?['grade_level'], 'Grade 7');
      expect(find.text('Created'), findsOneWidget);
      await tester.tap(find.text('Close'));
      await tester.pumpAndSettle();
    });
  }

  testWidgets('server permission errors are visible rather than an empty success state', (tester) async {
    final study = Study(ElimuApi(client: MockClient((_) async => http.Response('{"detail":"Not permitted"}', 403))));
    await study.initialize();
    study.user = {'id': 'test-teacher', 'role': 'teacher'};
    await tester.pumpWidget(MaterialApp(theme: appTheme(false), home: FeaturePage(
      study: study, feature: features.firstWhere((feature) => feature.id == 'classes'))));
    await tester.pumpAndSettle();
    expect(find.text('Not permitted'), findsOneWidget);
    expect(find.text('Nothing here yet'), findsNothing);
  });

  testWidgets('super admin can update a plan from user details with confirmation', (tester) async {
    Map<String, dynamic>? sent;
    final api = ElimuApi(client: MockClient((request) async {
      if (request.method == 'PUT') {
        expect(request.url.path, '/api/admin/users/learner/subscription');
        sent = Map<String, dynamic>.from(jsonDecode(request.body));
        return http.Response('{"message":"Subscription updated"}', 200);
      }
      return http.Response(jsonEncode({'user': {'id': 'learner', 'name': 'Amani', 'role': 'student', 'is_active': 1,
        'email_verified': 1, 'plan': 'student', 'total_xp': 100}, 'activity': [], 'payments': [], 'invoices': [], 'aiSessions': []}), 200);
    }));
    final study = Study(api);
    await study.initialize();
    study.user = {'id': 'operator', 'role': 'super_admin'};
    await tester.pumpWidget(MaterialApp(theme: appTheme(false), home: RecordPage(study: study,
      feature: features.firstWhere((feature) => feature.id == 'users'), record: const {'id': 'learner', 'name': 'Amani'}, onEdit: () async {})));
    await tester.pumpAndSettle();
    expect(find.text('Active account'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Manage subscription'), 300, scrollable: find.byType(Scrollable).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Manage subscription'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField), '90');
    await tester.tap(find.text('Save'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(sent, isNull);
    await tester.tap(find.text('Confirm'));
    await tester.pumpAndSettle();
    expect(sent, {'plan': 'student', 'days': 90});
    expect(find.text('Subscription updated'), findsOneWidget);
    await tester.tap(find.text('Close'));
    await tester.pumpAndSettle();
  });

  testWidgets('parent cannot open platform user management directly', (tester) async {
    final study = Study(ElimuApi(client: MockClient((_) async => throw StateError('Must not contact server'))));
    await study.initialize();
    study.user = {'id': 'parent', 'role': 'parent'};
    await tester.pumpWidget(MaterialApp(theme: appTheme(false), home: RecordPage(study: study,
      feature: features.firstWhere((feature) => feature.id == 'users'), record: const {'id': 'learner'}, onEdit: () async {})));
    await tester.pumpAndSettle();
    expect(find.text('Not available for this account'), findsOneWidget);
    expect(find.text('Change role'), findsNothing);
  });
}