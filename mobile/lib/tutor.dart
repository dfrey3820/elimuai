import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';

import 'study.dart';
import 'ui.dart';
import 'photo_scan.dart';

/// Chat bubble shared by the live tutor and the offline session reader.
Widget tutorBubble(BuildContext context, Map<String, String> message) {
  final isUser = message['role'] == 'user';
  if (isUser) {
    return Align(alignment: Alignment.centerRight, child: Container(
      margin: const EdgeInsets.only(bottom: 14, left: 40), padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
      constraints: const BoxConstraints(maxWidth: 620),
      decoration: const BoxDecoration(gradient: brandGradient,
        borderRadius: BorderRadius.only(topLeft: Radius.circular(18), topRight: Radius.circular(18),
          bottomLeft: Radius.circular(18), bottomRight: Radius.circular(4))),
      child: Text(message['content'] ?? '', style: const TextStyle(color: Colors.white, height: 1.5))));
  }
  return Align(alignment: Alignment.centerLeft, child: Container(
    margin: const EdgeInsets.only(bottom: 14, right: 24), constraints: const BoxConstraints(maxWidth: 640),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Container(width: 24, height: 24, decoration: BoxDecoration(gradient: heroGradient,
          borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.auto_awesome, size: 14, color: Colors.white)),
        const SizedBox(width: 8),
        const Text('ElimuAI tutor', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: emerald)),
      ]),
      const SizedBox(height: 8),
      Container(padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
        decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface,
          borderRadius: const BorderRadius.only(topLeft: Radius.circular(4), topRight: Radius.circular(18),
            bottomLeft: Radius.circular(18), bottomRight: Radius.circular(18)),
          border: Border.all(color: Theme.of(context).colorScheme.outlineVariant.withValues(alpha: .4))),
        child: MarkdownBody(data: message['content'] ?? '', selectable: true)),
    ])));
}

class Tutor extends StatefulWidget {
  const Tutor({super.key, required this.study, this.initialSubject = 'Mathematics'});
  final Study study;
  final String initialSubject;
  @override
  State<Tutor> createState() => _TutorState();
}

class _TutorState extends State<Tutor> {
  final input = TextEditingController();
  final scroll = ScrollController();
  late String subject = widget.initialSubject;
  final List<Map<String, String>> messages = [];
  bool busy = false;
  String? error;

  Future<void> send([String? prompt]) async {
    final text = (prompt ?? input.text).trim();
    if (text.isEmpty || busy || widget.study.demo) return;
    setState(() {
      messages.add({'role': 'user', 'content': text});
      input.clear(); busy = true; error = null;
    });
    moveDown();
    try {
      final response = await widget.study.api.post('/api/ai/tutor', {'subject': subject, 'messages': messages});
      final reply = response['reply'];
      if (reply is! String || reply.trim().isEmpty) {
        throw Exception('The tutor did not return an answer. Please try again.');
      }
      if (!mounted) return;
      setState(() => messages.add({'role': 'assistant', 'content': reply}));
    } catch (failure) {
      if (!mounted) return;
      setState(() {
        messages.removeLast();
        input.text = text;
        error = '$failure';
      });
    } finally {
      if (mounted) { setState(() => busy = false); moveDown(); }
    }
  }

  Future<void> saveSession() async {
    if (messages.isEmpty || widget.study.demo) return;
    await widget.study.saveTutorSession(subject, messages);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      behavior: SnackBarBehavior.floating,
      content: const Text('Saved for offline reading'),
      action: SnackBarAction(label: 'View', onPressed: openSaved),
    ));
  }

  void openSaved() => Navigator.push(context,
    MaterialPageRoute(builder: (_) => SavedTutorSessions(study: widget.study)));

  void moveDown() => WidgetsBinding.instance.addPostFrameCallback((_) {
    if (scroll.hasClients) {
      scroll.animateTo(scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220), curve: Curves.easeOut);
    }
  });

  @override
  void dispose() { input.dispose(); scroll.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final choices = {subject, ...widget.study.subjects.map((item) => '${item['name']}')}.toList();
    final canSave = messages.isNotEmpty && !busy && !widget.study.demo;
    return ColoredBox(color: dark ? const Color(0xFF151824) : const Color(0xFFF1EEFA), child: Column(children: [
      Padding(padding: const EdgeInsets.fromLTRB(20, 14, 12, 6), child: Row(children: [
        Container(width: 42, height: 42, decoration: BoxDecoration(gradient: brandGradient,
          borderRadius: BorderRadius.circular(13)), child: const Icon(Icons.auto_awesome, color: Colors.white, size: 22)),
        const SizedBox(width: 12),
        const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Aha starts here.', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          Text('Your ElimuAI tutor', style: TextStyle(fontSize: 12, color: emerald, fontWeight: FontWeight.w600)),
        ])),
        IconButton(tooltip: 'Saved sessions', onPressed: openSaved, icon: const Icon(Icons.bookmarks_outlined)),
      ])),
      SizedBox(height: 42, child: ListView(scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20), children: [
        for (final name in choices) Padding(padding: const EdgeInsets.only(right: 8), child: ChoiceChip(
          label: Text(name), selected: subject == name, showCheckmark: false,
          onSelected: busy ? null : (_) => setState(() { subject = name; messages.clear(); error = null; }))),
      ])),
      Expanded(child: ListView(controller: scroll, padding: const EdgeInsets.fromLTRB(20, 14, 20, 14), children: [
        if (widget.study.demo) const Notice('Demo preview. Sign in to ask the live AI tutor.', icon: Icons.lock_outline),
        if (messages.isEmpty) ...[
          const SizedBox(height: 26),
          Center(child: Container(width: 96, height: 96, decoration: BoxDecoration(gradient: brandGradient,
            shape: BoxShape.circle, boxShadow: [BoxShadow(color: purple.withValues(alpha: .35),
              blurRadius: 30, offset: const Offset(0, 14))]), child: const Icon(Icons.auto_awesome, color: Colors.white, size: 46))),
          const SizedBox(height: 22),
          const Text('Let\'s figure it out.\nTogether.', textAlign: TextAlign.center,
            style: TextStyle(fontSize: 27, fontWeight: FontWeight.w900, height: 1.25)),
          const SizedBox(height: 12),
          Text('What are you curious about in $subject?', textAlign: TextAlign.center,
            style: TextStyle(height: 1.6, color: Theme.of(context).colorScheme.onSurfaceVariant)),
          const SizedBox(height: 26),
          ...[
            ('Explain a tricky concept', Icons.lightbulb_outline),
            ('Give me a practice question', Icons.quiz_outlined),
            ('Help me revise', Icons.menu_book_outlined),
          ].map((item) => Padding(padding: const EdgeInsets.only(bottom: 10), child: Material(
            color: Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(16),
            child: InkWell(borderRadius: BorderRadius.circular(16),
              onTap: widget.study.demo ? null : () => send('${item.$1} in $subject.'),
              child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [
                Icon(item.$2, size: 20, color: purple), const SizedBox(width: 12),
                Expanded(child: Text(item.$1, style: const TextStyle(fontWeight: FontWeight.w600))),
                const Icon(Icons.north_east_rounded, size: 16),
              ])))))),
        ],
        ...messages.map((message) => tutorBubble(context, message)),
        if (busy) Padding(padding: const EdgeInsets.all(10), child: Row(children: [
          Container(width: 24, height: 24, decoration: BoxDecoration(gradient: heroGradient,
            borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.auto_awesome, size: 14, color: Colors.white)),
          const SizedBox(width: 10),
          const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
          const SizedBox(width: 10), const Text('Thinking it through...'),
        ])),
        if (error != null) Notice(error!, icon: Icons.error_outline),
      ])),
      Material(elevation: 8, color: Theme.of(context).colorScheme.surface, child: Padding(
        padding: EdgeInsets.fromLTRB(16, 10, 16, 12 + MediaQuery.of(context).padding.bottom),
        child: Row(children: [
          IconButton(tooltip: 'Photo Scan', onPressed: busy ? null : () => Navigator.push(context,
            MaterialPageRoute(builder: (_) => PhotoScanPage(study: widget.study))), icon: const Icon(Icons.camera_alt_outlined)),
          IconButton(tooltip: 'Save for offline', onPressed: canSave ? saveSession : null, icon: const Icon(Icons.bookmark_add_outlined)),
          IconButton(tooltip: 'New conversation', onPressed: busy || messages.isEmpty ? null : () => setState(() { messages.clear(); error = null; }),
            icon: const Icon(Icons.edit_square)),
          Expanded(child: TextField(controller: input, enabled: !widget.study.demo && !busy, minLines: 1, maxLines: 4,
            maxLength: 6000, textInputAction: TextInputAction.send, onSubmitted: (_) => send(),
            decoration: InputDecoration(counterText: '', isDense: true,
              hintText: widget.study.demo ? 'Sign in to ask a question' : 'Ask anything...'))),
          const SizedBox(width: 8),
          GestureDetector(onTap: busy || widget.study.demo ? null : () => send(), child: Container(
            width: 48, height: 48, decoration: BoxDecoration(
              gradient: busy || widget.study.demo ? null : brandGradient,
              color: busy || widget.study.demo ? Theme.of(context).disabledColor.withValues(alpha: .2) : null,
              borderRadius: BorderRadius.circular(15)),
            child: const Icon(Icons.arrow_upward_rounded, color: Colors.white))),
        ]))),
    ]));
  }
}

class SavedTutorSessions extends StatelessWidget {
  const SavedTutorSessions({super.key, required this.study});
  final Study study;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Saved sessions', style: TextStyle(fontSize: 18))),
    body: ListenableBuilder(listenable: study, builder: (context, _) {
      final sessions = study.tutorSessions;
      if (sessions.isEmpty) {
        return const EmptyState(icon: Icons.bookmarks_outlined, title: 'No saved sessions yet',
          subtitle: 'Save a tutor conversation to read it offline, anytime.');
      }
      return ListView.builder(padding: const EdgeInsets.fromLTRB(16, 16, 16, 30), itemCount: sessions.length,
        itemBuilder: (context, i) {
          final session = sessions[i];
          final (icon, color) = subjectVisual(session.subject);
          return Padding(padding: const EdgeInsets.only(bottom: 10), child: Material(
            color: Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(16),
            child: InkWell(borderRadius: BorderRadius.circular(16), onTap: () => Navigator.push(context,
              MaterialPageRoute(builder: (_) => TutorSessionReader(session: session))),
              child: Padding(padding: const EdgeInsets.all(14), child: Row(children: [
                Container(width: 44, height: 44, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(12)),
                  child: Icon(icon, color: Colors.white, size: 22)),
                const SizedBox(width: 14),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(session.title, maxLines: 2, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w800, height: 1.35)),
                  const SizedBox(height: 4),
                  Text('${session.subject} / ${session.exchanges} question${session.exchanges == 1 ? '' : 's'} / ${_ago(session.savedAt)}',
                    style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                ])),
                IconButton(tooltip: 'Delete', onPressed: () => study.deleteTutorSession(session.id),
                  icon: const Icon(Icons.delete_outline)),
              ])))));
        });
    }));
}

class TutorSessionReader extends StatelessWidget {
  const TutorSessionReader({super.key, required this.session});
  final TutorSession session;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(session.subject, style: const TextStyle(fontSize: 18))),
    body: ListView(padding: const EdgeInsets.fromLTRB(20, 16, 20, 30), children: [
      const Notice('Saved for offline reading.', icon: Icons.cloud_done_outlined),
      const SizedBox(height: 8),
      ...session.messages.map((message) => tutorBubble(context, message)),
    ]));
}

String _ago(DateTime when) {
  final diff = DateTime.now().difference(when);
  if (diff.inDays >= 1) return '${diff.inDays}d ago';
  if (diff.inHours >= 1) return '${diff.inHours}h ago';
  if (diff.inMinutes >= 1) return '${diff.inMinutes}m ago';
  return 'just now';
}