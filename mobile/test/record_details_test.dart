import 'package:elimuai_mobile/record_details.dart';
import 'package:elimuai_mobile/ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final width in [320.0, 430.0, 900.0]) {
    testWidgets('person details show structured profile and tabs at $width', (tester) async {
      tester.view.physicalSize = Size(width, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(MaterialApp(theme: appTheme(false), home: Scaffold(body: ListView(
        padding: const EdgeInsets.all(20), children: [PersonDetails(record: const {'id': 'user', 'name': 'Amani Wanjiku Kamau'}, detail: const {
          'user': {'name': 'Amani Wanjiku Kamau', 'role': 'student', 'email': 'amani@example.com', 'is_active': true,
            'email_verified': true, 'plan': 'student', 'total_xp': 420, 'streak_days': 4, 'grade_level': 'Grade 7'},
          'activity': [{'activity_type': 'exam_complete', 'score': 85, 'xp_earned': 20, 'logged_date': '2026-10-29'}],
          'payments': [{'amount': 100, 'currency': 'KES', 'status': 'completed', 'plan': 'student'}],
          'invoices': [], 'aiSessions': [], 'aiStats': {'total_sessions': 3, 'total_messages': 12},
        })],
      ))));
      await tester.pumpAndSettle();
      expect(find.text('Amani Wanjiku Kamau'), findsOneWidget);
      expect(find.text('Email verified'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Activity'), 180, scrollable: find.byType(Scrollable).first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Activity'));
      await tester.pumpAndSettle();
      expect(find.text('exam complete'), findsOneWidget);
      await tester.tap(find.text('Billing'));
      await tester.pumpAndSettle();
      expect(find.text('KES 100.00'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }
}