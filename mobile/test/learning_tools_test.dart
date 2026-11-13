import 'package:elimuai_mobile/learning_tools.dart';
import 'package:elimuai_mobile/api.dart';
import 'package:elimuai_mobile/study.dart';
import 'package:elimuai_mobile/ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('exam option encoding matches the server letter contract', () {
    expect(optionKey('A. Four', 0), 'A');
    expect(optionKey('B) Five', 1), 'B');
    expect(optionKey('Four', 2), 'C');
    expect(examScore([{'answer': 'B'}, {'answer': 'A'}, {'answer': 'C'}], {'0': 'B', '1': 'D'}), 1);
  });
  testWidgets('confirmed exit leaves unfinished exam without a second dialog', (tester) async {
    final study = Study(ElimuApi())..demo = true;
    await tester.pumpWidget(MaterialApp(theme: appTheme(false), home: Builder(builder: (context) => Scaffold(
      body: TextButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ExamPractice(
        study: study, paper: const {'title': 'Practice', 'questions': [
          {'q': 'One plus one?', 'options': ['A. 2', 'B. 3'], 'answer': 'A'},
        ]},
      ))), child: const Text('Open practice')),
    ))));
    await tester.tap(find.text('Open practice'));
    await tester.pumpAndSettle();
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text('Confirm'));
    await tester.pumpAndSettle();
    expect(find.text('Open practice'), findsOneWidget);
    expect(find.text('Confirm'), findsNothing);
  });
}