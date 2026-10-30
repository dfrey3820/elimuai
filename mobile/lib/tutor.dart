import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';

import 'study.dart';
import 'ui.dart';
import 'photo_scan.dart';

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
      if (!mounted) {
        return;
      }
      setState(() {
        messages.removeLast();
        input.text = text;
        error = '$failure';
      });
    } finally {
      if (mounted) { setState(() => busy = false); moveDown(); }
    }
  }

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
    final choices = {subject, ...widget.study.subjects.map((item) => '${item['name']}')}.toList();
    return ColoredBox(color: Theme.of(context).brightness == Brightness.dark
      ? const Color(0xFF202337) : const Color(0xFFEDEAF7), child: Column(children: [
      Padding(padding: const EdgeInsets.fromLTRB(22, 16, 22, 8), child: Row(children: [
        const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Aha starts here.', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
          SizedBox(height: 5), Text('Your ElimuAI tutor', style: TextStyle(fontSize: 12, color: emerald)),
        ])),
        IconButton(tooltip: 'Photo Scan', onPressed: busy ? null : () => Navigator.push(context,
          MaterialPageRoute(builder: (_) => PhotoScanPage(study: widget.study))), icon: const Icon(Icons.camera_alt_outlined)),
        IconButton(tooltip: 'New conversation', onPressed: busy ? null : () => setState(() { messages.clear(); error = null; }),
          icon: const Icon(Icons.edit_square)),
      ])),
      Padding(padding: const EdgeInsets.fromLTRB(22, 8, 22, 8), child: DropdownButtonFormField<String>(
        key: ValueKey(subject), initialValue: subject, isExpanded: true,
        decoration: const InputDecoration(prefixIcon: Icon(Icons.auto_stories_outlined), labelText: 'Subject'),
        items: choices.map((name) => DropdownMenuItem(value: name, child: Text(name, overflow: TextOverflow.ellipsis))).toList(),
        onChanged: busy ? null : (value) => setState(() { subject = value!; messages.clear(); error = null; }),
      )),
      Expanded(child: ListView(controller: scroll, padding: const EdgeInsets.all(22), children: [
        if (widget.study.demo) const Notice('Demo preview. Sign in to ask the live AI tutor.', icon: Icons.lock_outline),
        if (messages.isEmpty) ...[
          const SizedBox(height: 30),
          const Icon(Icons.auto_awesome, color: purple, size: 42),
          const SizedBox(height: 18),
          Text('Let\'s figure it out.\nTogether.', textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, height: 1.3)),
          const SizedBox(height: 14),
          Text('What are you curious about in $subject?', textAlign: TextAlign.center,
            style: TextStyle(height: 1.6, color: Theme.of(context).colorScheme.onSurfaceVariant)),
          const SizedBox(height: 28),
          ...['Explain a tricky concept', 'Give me a practice question', 'Help me revise'].map((prompt) =>
            Padding(padding: const EdgeInsets.only(bottom: 10), child: OutlinedButton(
              onPressed: widget.study.demo ? null : () => send('$prompt in $subject.'),
              style: OutlinedButton.styleFrom(padding: const EdgeInsets.all(16), alignment: Alignment.centerLeft,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
              child: Row(children: [Expanded(child: Text(prompt)), const Icon(Icons.north_east, size: 16)])))),
        ],
        ...messages.map((message) {
          final isUser = message['role'] == 'user';
          return Align(alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
            child: Container(margin: const EdgeInsets.only(bottom: 18), padding: const EdgeInsets.all(16),
              constraints: const BoxConstraints(maxWidth: 620),
              decoration: BoxDecoration(color: isUser ? purple.withValues(alpha: .10) : Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(8)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(isUser ? 'YOU' : 'ELIMUAI', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: isUser ? purple : emerald)),
                const SizedBox(height: 10), MarkdownBody(data: message['content']!, selectable: true),
              ])));
        }),
        if (busy) const Padding(padding: EdgeInsets.all(12), child: Row(children: [
          SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
          SizedBox(width: 12), Text('Thinking it through...'),
        ])),
        if (error != null) Notice(error!, icon: Icons.error_outline),
      ])),
      Padding(padding: const EdgeInsets.fromLTRB(18, 8, 18, 14), child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
        Expanded(child: TextField(controller: input, enabled: !widget.study.demo && !busy, minLines: 1, maxLines: 4,
          maxLength: 6000, textInputAction: TextInputAction.send, onSubmitted: (_) => send(),
          decoration: InputDecoration(counterText: '', hintText: widget.study.demo ? 'Sign in to ask a question' : 'Ask a question...'))),
        const SizedBox(width: 8), IconButton.filled(onPressed: busy || widget.study.demo ? null : () => send(),
          tooltip: 'Send question', style: IconButton.styleFrom(minimumSize: const Size(52, 52),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))), icon: const Icon(Icons.arrow_upward_rounded)),
      ]),),
    ]));
  }
}