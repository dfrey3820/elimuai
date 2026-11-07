import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';

import 'feature_views.dart';
import 'study.dart';
import 'ui.dart';

String optionKey(String option, int index) => RegExp(r'^[A-Z][.)\s:]').hasMatch(option)
    ? option[0] : String.fromCharCode(65 + index);

int examScore(List<Map<String, dynamic>> questions, Map<String, String> answers) =>
  questions.indexed.where((entry) => answers['${entry.$1}'] == '${entry.$2['answer']}').length;

class HomeworkLab extends StatefulWidget {
  const HomeworkLab({super.key, required this.study});
  final Study study;
  @override
  State<HomeworkLab> createState() => _HomeworkLabState();
}

class _HomeworkLabState extends State<HomeworkLab> {
  final question = TextEditingController();
  final answer = TextEditingController();
  String mode = 'solve';
  String? subject;
  String? reply;
  String? error;
  bool busy = false;
  Future<void> send() async {
    if (busy || widget.study.demo) return;
    if (question.text.trim().isEmpty || subject == null || (mode == 'check' && answer.text.trim().isEmpty)) {
      setState(() => error = 'Choose a subject, enter your question, and add your answer when checking work.');
      return;
    }
    setState(() { busy = true; error = null; reply = null; });
    try {
      final result = await widget.study.api.post('/api/ai/homework', {
        'question': question.text.trim(), 'studentAnswer': answer.text.trim(), 'mode': mode, 'subject': subject,
      });
      if (mounted) setState(() => reply = '${result['reply'] ?? 'No answer was returned. Please try again.'}');
    } catch (failure) { if (mounted) setState(() => error = '$failure'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override
  void dispose() { question.dispose(); answer.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Homework lab')),
    body: ListView(padding: const EdgeInsets.all(22), children: [
      const Icon(Icons.lightbulb_rounded, color: orange, size: 48), const SizedBox(height: 16),
      const Text('Give your curiosity\nsome room.', style: TextStyle(fontSize: 28, height: 1.25, fontWeight: FontWeight.w900)),
      if (widget.study.demo) const Notice('Demo preview. Sign in for live homework help.'),
      const SizedBox(height: 22), DropdownButtonFormField<String>(isExpanded: true,
        decoration: const InputDecoration(labelText: 'Subject'),
        items: widget.study.subjects.map((item) => DropdownMenuItem(value: '${item['name']}', child: Text('${item['name']}'))).toList(),
        onChanged: busy ? null : (value) => setState(() => subject = value)),
      const SizedBox(height: 16), SegmentedButton<String>(segments: const [
        ButtonSegment(value: 'solve', label: Text('Help me learn'), icon: Icon(Icons.lightbulb_outline)),
        ButtonSegment(value: 'check', label: Text('Check my work'), icon: Icon(Icons.fact_check_outlined)),
      ], selected: {mode}, onSelectionChanged: busy ? null : (values) => setState(() => mode = values.first)),
      const SizedBox(height: 16), TextField(controller: question, minLines: 4, maxLines: 8, maxLength: 6000,
        decoration: const InputDecoration(labelText: 'Your question'), enabled: !busy),
      if (mode == 'check') Padding(padding: const EdgeInsets.only(top: 14), child: TextField(controller: answer,
        minLines: 3, maxLines: 6, decoration: const InputDecoration(labelText: 'Your answer'), enabled: !busy)),
      const SizedBox(height: 20), FilledButton.icon(onPressed: busy || widget.study.demo ? null : send,
        icon: const Icon(Icons.auto_awesome), label: Text(busy ? 'Thinking...' : 'Let\'s work it out')),
      if (busy) const LinearProgressIndicator(),
      if (error != null) Notice(error!, icon: Icons.error_outline),
      if (reply != null) Padding(padding: const EdgeInsets.only(top: 24), child: MarkdownBody(data: reply!, selectable: true)),
    ]));
}

class ExamStudio extends StatefulWidget {
  const ExamStudio({super.key, required this.study});
  final Study study;
  @override
  State<ExamStudio> createState() => _ExamStudioState();
}

class _ExamStudioState extends State<ExamStudio> {
  List<Map<String, dynamic>> papers = [];
  String? subject;
  String? error;
  bool busy = false;
  int count = 10;
  @override
  void initState() { super.initState(); load(); }
  Future<void> load() async {
    if (widget.study.demo) return;
    setState(() { busy = true; error = null; });
    try {
      final result = await widget.study.api.get('/api/exams/papers');
      if (mounted) {
        setState(() => papers = (result['papers'] as List? ?? []).whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item)).toList());
      }
    } catch (failure) { if (mounted) setState(() => error = '$failure'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> open([Map<String, dynamic>? paper]) async {
    if (busy) return;
    if (paper == null && subject == null && !widget.study.demo) {
      setState(() => error = 'Choose a subject first.'); return;
    }
    setState(() { busy = true; error = null; });
    try {
      final data = widget.study.demo ? <String, dynamic>{'title': 'Fraction explorer / Demo', 'questions': [
        {'q': 'What is 1/4 + 2/4?', 'options': ['A. 1/4', 'B. 3/4', 'C. 3/8', 'D. 1/2'], 'answer': 'B', 'explanation': 'Add the numerators when the denominators are equal.'},
        {'q': 'Which fraction equals 1/2?', 'options': ['A. 2/4', 'B. 1/4', 'C. 3/4', 'D. 1/3'], 'answer': 'A', 'explanation': 'Multiply the numerator and denominator by 2.'},
      ]} : paper == null ? await widget.study.api.post('/api/exams/generate', {
          'subjectId': subject, 'count': count, if (widget.study.level.isNotEmpty) 'gradeLevel': widget.study.level,
          if (widget.study.user?['country'] != null) 'country': widget.study.user!['country'],
          if (widget.study.user?['curriculum'] != null) 'curriculum': widget.study.user!['curriculum'],
        }) : await widget.study.api.get('/api/exams/papers/${Uri.encodeComponent('${paper['id']}')}/questions');
      if ((data['questions'] as List? ?? []).isEmpty) {
        throw Exception('This paper has no questions.');
      }
      if (!mounted) return;
      await Navigator.push(context, MaterialPageRoute(builder: (_) => ExamPractice(study: widget.study, paper: data)));
      if (mounted) await load();
    } catch (failure) { if (mounted) setState(() => error = '$failure'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Exam practice')),
    body: RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.all(22), children: [
      const Icon(Icons.quiz_rounded, color: sky, size: 48), const SizedBox(height: 14),
      const Text('Practice today.\nWalk in confident.', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, height: 1.25)),
      if (widget.study.demo) const Notice('Demo / sample questions. Results will not be sent to the server.'),
      const SizedBox(height: 24), DropdownButtonFormField<String>(isExpanded: true,
        decoration: const InputDecoration(labelText: 'Subject'),
        items: widget.study.subjects.map((item) => DropdownMenuItem(value: '${item['id']}', child: Text('${item['name']}'))).toList(),
        onChanged: busy ? null : (value) => subject = value),
      const SizedBox(height: 16), Text('$count questions', style: const TextStyle(fontWeight: FontWeight.w800)),
      Slider(value: count.toDouble(), min: 5, max: 40, divisions: 7, label: '$count',
        onChanged: busy ? null : (value) => setState(() => count = value.round())),
      FilledButton.icon(onPressed: busy ? null : () => open(), icon: const Icon(Icons.play_arrow_rounded),
        label: Text(busy ? 'Preparing...' : widget.study.demo ? 'Try a sample paper' : 'Generate practice paper')),
      if (busy) const Padding(padding: EdgeInsets.only(top: 16), child: LinearProgressIndicator()),
      if (error != null) Notice(error!, onRetry: load),
      const SectionTitle('Your papers'),
      if (papers.isEmpty && !busy) const EmptyState(icon: Icons.library_books_outlined, title: 'A fresh start', subtitle: 'Your generated papers will appear here.'),
      ...papers.map((paper) => ListTile(leading: const Icon(Icons.description_outlined, color: sky),
        title: Text('${paper['title']}'), subtitle: Text('${paper['subject_name'] ?? ''}'),
        trailing: const Icon(Icons.chevron_right), onTap: busy ? null : () => open(paper))),
    ])));
}

class ExamPractice extends StatefulWidget {
  const ExamPractice({super.key, required this.study, required this.paper});
  final Study study;
  final Map<String, dynamic> paper;
  @override
  State<ExamPractice> createState() => _ExamPracticeState();
}

class _ExamPracticeState extends State<ExamPractice> {
  late final questions = (widget.paper['questions'] as List).map((item) => Map<String, dynamic>.from(item)).toList();
  final answers = <String, String>{};
  final elapsed = Stopwatch()..start();
  bool busy = false;
  bool submitted = false;
  String? error;
  int xp = 0;
  Future<void> submit() async {
    if (busy || submitted) return;
    if (answers.length < questions.length && !await confirmAction(context,
      '${questions.length - answers.length} unanswered. Submit anyway?')) {
      return;
    }
    setState(() { busy = true; error = null; });
    try {
      final result = widget.study.demo ? <String, dynamic>{'xpEarned': 0} : await widget.study.api.post('/api/exams/attempts', {
        'pastPaperId': widget.paper['id'], 'questions': questions, 'answers': answers,
        'score': examScore(questions, answers), 'total': questions.length, 'timeTakenSecs': elapsed.elapsed.inSeconds,
      });
      if (mounted) setState(() { submitted = true; xp = (result['xpEarned'] as num? ?? 0).toInt(); elapsed.stop(); });
    } catch (failure) { if (mounted) setState(() => error = '$failure'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override
  Widget build(BuildContext context) => PopScope(canPop: submitted, onPopInvokedWithResult: (didPop, _) async {
    if (!didPop && !busy && await confirmAction(context, 'Leave this practice? Your answers have not been submitted.')) {
      if (context.mounted) Navigator.pop(context);
    }
  }, child: Scaffold(appBar: AppBar(title: Text('${widget.paper['title'] ?? 'Practice'}', maxLines: 1, overflow: TextOverflow.ellipsis)),
    body: ListView(padding: const EdgeInsets.all(22), children: [
      if (submitted) Container(padding: const EdgeInsets.all(22), color: sunshine, child: Column(children: [
        const Icon(Icons.emoji_events_rounded, color: Color(0xFF764500), size: 48), const SizedBox(height: 12),
        Text('${examScore(questions, answers)}/${questions.length}', style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w900, color: Color(0xFF332710))),
        Text(widget.study.demo ? 'Demo complete' : 'Attempt saved / +$xp XP', style: const TextStyle(color: Color(0xFF332710))),
      ])),
      for (final (index, question) in questions.indexed) Padding(padding: const EdgeInsets.only(top: 22),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${index + 1}. ${question['q']}', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, height: 1.5)),
          const SizedBox(height: 10),
          RadioGroup<String>(groupValue: answers['$index'], onChanged: (value) {
            if (!submitted && !busy && value != null) setState(() => answers['$index'] = value);
          }, child: Column(children: [
            for (final (optionIndex, option) in (question['options'] as List? ?? []).indexed)
              RadioListTile<String>(value: optionKey('$option', optionIndex), title: Text('$option'), enabled: !submitted && !busy,
                contentPadding: EdgeInsets.zero),
          ])),
          if (submitted) ...[
            Text('Correct answer: ${question['answer']}', style: const TextStyle(color: emerald, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8), MarkdownBody(data: '${question['explanation'] ?? ''}'),
          ],
        ])),
      if (error != null) Notice(error!, icon: Icons.error_outline),
      const SizedBox(height: 26), FilledButton.icon(onPressed: busy ? null : submitted ? () => Navigator.pop(context) : submit,
        icon: Icon(submitted ? Icons.check : Icons.send_outlined), label: Text(busy ? 'Saving...' : submitted ? 'Done' : 'Submit answers')),
    ])));
}

class SchoolInsights extends StatefulWidget {
  const SchoolInsights({super.key, required this.study});
  final Study study;
  @override
  State<SchoolInsights> createState() => _SchoolInsightsState();
}

class _SchoolInsightsState extends State<SchoolInsights> {
  bool busy = false;
  String? report;
  String? error;
  Future<void> generate() async {
    if (widget.study.demo || busy) return;
    setState(() { busy = true; error = null; });
    try {
      final school = widget.study.user?['school_id'];
      if (school == null) throw Exception('Your account is not associated with a school.');
      final stats = await widget.study.api.get('/api/schools/${Uri.encodeComponent('$school')}/stats');
      final result = await widget.study.api.post('/api/ai/school-insights', {'classData': {
        'role': widget.study.role, 'school': stats['school'] ?? stats,
      }});
      if (mounted) setState(() => report = '${result['insights'] ?? 'No report was returned.'}');
    } catch (failure) { if (mounted) setState(() => error = '$failure'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('School insights')),
    body: ListView(padding: const EdgeInsets.all(22), children: [
      const Icon(Icons.auto_awesome, color: purple, size: 48), const SizedBox(height: 20),
      const Text('See the bigger picture.', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
      const SizedBox(height: 20),
      if (widget.study.demo) const Notice('Sign in with a school administrator account to generate a live report.'),
      FilledButton.icon(onPressed: busy || widget.study.demo ? null : generate,
        icon: const Icon(Icons.insights), label: Text(busy ? 'Preparing report...' : 'Generate school report')),
      if (busy) const LinearProgressIndicator(),
      if (error != null) Notice(error!),
      if (report != null) Padding(padding: const EdgeInsets.only(top: 22), child: MarkdownBody(data: report!, selectable: true)),
    ]));
}