import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';

import 'features.dart';
import 'study.dart';
import 'tutor.dart';
import 'ui.dart';
import 'workspace.dart';

class StudyShell extends StatefulWidget {
  const StudyShell({super.key, required this.study});
  final Study study;
  @override
  State<StudyShell> createState() => _StudyShellState();
}

class _StudyShellState extends State<StudyShell> {
  int tab = 0;
  String? subject;
  String tutorSubject = 'Mathematics';
  int tutorVersion = 0;
  void learn([String? value]) => setState(() { subject = value; tab = 1; });
  void ask(String value) => setState(() { tutorSubject = value; tutorVersion++; tab = 2; });

  @override
  Widget build(BuildContext context) {
    final study = widget.study;
    return ListenableBuilder(listenable: study, builder: (context, _) => Scaffold(
      appBar: AppBar(title: const Brand(compact: true), actions: [
        if (study.demo) const Padding(padding: EdgeInsets.only(right: 6), child: Text('DEMO',
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: emerald))),
        IconButton(tooltip: 'Account', onPressed: () => account(context, study),
          icon: CircleAvatar(radius: 18, backgroundColor: purple.withValues(alpha: .12),
            child: Text(study.name.isEmpty ? 'E' : study.name[0].toUpperCase(),
              style: const TextStyle(color: purple, fontWeight: FontWeight.w800)))),
        const SizedBox(width: 10),
      ]),
      body: SafeArea(top: false, child: Center(child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 850), child: IndexedStack(index: tab, children: [
          study.role == 'student' ? Home(study: study, learn: learn, ask: ask)
            : Workspace(study: study, overview: true),
          Library(study: study, subject: subject, onSubject: (value) => setState(() => subject = value)),
          Tutor(key: ValueKey(tutorVersion), study: study, initialSubject: tutorSubject),
          Library(study: study, savedOnly: true),
          Workspace(study: study),
        ]),
      ))),
      bottomNavigationBar: NavigationBar(selectedIndex: tab, onDestinationSelected: (value) => setState(() => tab = value),
        destinations: [
          const NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home_rounded), label: 'Home'),
          const NavigationDestination(icon: Icon(Icons.auto_stories_outlined), selectedIcon: Icon(Icons.auto_stories), label: 'Learn'),
          const NavigationDestination(icon: Icon(Icons.auto_awesome_outlined), selectedIcon: Icon(Icons.auto_awesome), label: 'Tutor'),
          const NavigationDestination(icon: Icon(Icons.bookmark_border_rounded), selectedIcon: Icon(Icons.bookmark_rounded), label: 'Saved'),
          NavigationDestination(icon: const Icon(Icons.grid_view_outlined), selectedIcon: const Icon(Icons.grid_view_rounded), label: study.workspaceTitle),
        ]),
    ));
  }
}

class Home extends StatelessWidget {
  const Home({super.key, required this.study, required this.learn, required this.ask});
  final Study study;
  final void Function([String?]) learn;
  final void Function(String) ask;

  @override
  Widget build(BuildContext context) {
    final firstName = study.name.split(' ').first;
    final next = study.lessons.where((lesson) => !study.completed.contains(lesson.id)).firstOrNull;
    final available = study.lessons;
    final progress = available.isEmpty ? 0.0
        : available.where((lesson) => study.completed.contains(lesson.id)).length / available.length;
    return RefreshIndicator(onRefresh: study.load, child: ListView(
      physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.fromLTRB(22, 18, 22, 30), children: [
      Text([study.level, '${study.user?['curriculum'] ?? ''}'].where((item) => item.isNotEmpty).join(' / ').toUpperCase(),
        style: const TextStyle(fontSize: 11, color: emerald, fontWeight: FontWeight.w800)),
      const SizedBox(height: 9),
      Text('Your next chapter, $firstName.', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, height: 1.25)),
      const SizedBox(height: 8),
      Text('Small steps. Brighter futures.', style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 14)),
      if (study.demo) const Notice('Demo account / sample lessons', icon: Icons.science_outlined),
      if (study.error != null) Notice(study.error!, onRetry: study.load, icon: Icons.wifi_off_rounded),
      if (study.busy) const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: LinearProgressIndicator()),
      const SizedBox(height: 18),
      Container(color: emerald, padding: const EdgeInsets.all(16), child: LayoutBuilder(builder: (context, constraints) => Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Make today\na learning day.', style: TextStyle(fontSize: 23, height: 1.2, fontWeight: FontWeight.w800, color: Colors.white)),
          const SizedBox(height: 16),
          FilledButton.icon(onPressed: () => learn(), icon: const Icon(Icons.arrow_forward, size: 18),
            style: FilledButton.styleFrom(backgroundColor: sunshine, foregroundColor: const Color(0xFF263B2C),
              padding: const EdgeInsets.symmetric(horizontal: 10)),
            label: const Text('Let\'s learn')),
        ])),
        const SizedBox(width: 12),
        ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.asset('assets/images/teacher.jpg',
          width: constraints.maxWidth * .38, height: 164, fit: BoxFit.cover,
          alignment: const Alignment(.55, 0), semanticLabel: 'A learner in the library')),
      ]))),
      const SectionTitle('Your learning, at a glance'),
      Row(children: [
        Expanded(child: _Metric(label: 'Read', value: '${study.completed.length}', icon: Icons.task_alt_rounded, color: emerald)),
        Expanded(child: _Metric(label: 'Subjects', value: '${study.subjects.length}', icon: Icons.auto_stories_outlined, color: purple)),
        Expanded(child: _Metric(label: 'Saved', value: '${study.saved.length}', icon: Icons.bookmark_border_rounded, color: orange)),
      ]),
      if (available.isNotEmpty) ...[
        const SizedBox(height: 18),
        ClipRRect(borderRadius: BorderRadius.circular(4), child: LinearProgressIndicator(value: progress, minHeight: 5,
          backgroundColor: emerald.withValues(alpha: .1), color: emerald)),
        const SizedBox(height: 6), Text('${(progress * 100).round()}% of available lessons read',
          style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant)),
      ],
      SectionTitle('Jump into a subject', action: 'View all', onAction: () => learn()),
      LayoutBuilder(builder: (context, constraints) => Wrap(spacing: 10, runSpacing: 10,
        children: study.subjects.take(4).map((item) {
          final name = '${item['name']}';
          return SizedBox(width: (constraints.maxWidth - 10) / 2,
            child: Material(color: subjectVisual(name).$2.withValues(alpha:
              Theme.of(context).brightness == Brightness.dark ? .22 : .13),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8),
                side: BorderSide(color: Theme.of(context).colorScheme.outlineVariant.withValues(alpha: .5))),
              child: InkWell(borderRadius: BorderRadius.circular(8), onTap: () => learn('${item['id']}'),
                child: Padding(padding: const EdgeInsets.all(15), child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                  children: [SubjectIcon(name), const SizedBox(height: 14),
                    Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800), maxLines: 2),
                    const SizedBox(height: 4), Text('Explore lessons', style: TextStyle(fontSize: 11,
                      color: Theme.of(context).colorScheme.onSurfaceVariant)),
                  ])))));
        }).toList())),
      if (study.subjects.isEmpty && !study.busy && study.error == null)
        const Notice('No subjects available for your profile yet.'),
      if (next != null) ...[
        const SectionTitle('Up next'),
        LessonTile(lesson: next, study: study),
      ],
      const SectionTitle('Choose your next adventure'),
      Wrap(spacing: 8, runSpacing: 8, children: [
        for (final id in ['photoscan', 'exams', 'homework', 'progress', 'achievements']) ActionChip(
          avatar: Icon(features.firstWhere((feature) => feature.id == id).icon, size: 18,
            color: features.firstWhere((feature) => feature.id == id).color),
          label: Text(features.firstWhere((feature) => feature.id == id).title),
          onPressed: () => openFeature(context, study, features.firstWhere((feature) => feature.id == id))),
      ]),
      const SizedBox(height: 22),
      Container(decoration: BoxDecoration(border: Border(top: BorderSide(color: purple.withValues(alpha: .2)))),
        padding: const EdgeInsets.only(top: 18), child: Row(children: [
          const Icon(Icons.auto_awesome, color: purple, size: 30), const SizedBox(width: 14),
          const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('A question on your mind?', style: TextStyle(fontWeight: FontWeight.w800)),
            SizedBox(height: 4), Text('Ask your ElimuAI tutor', style: TextStyle(fontSize: 12)),
          ])),
          IconButton(tooltip: 'Open AI tutor', onPressed: () => ask('Mathematics'), icon: const Icon(Icons.arrow_forward_rounded)),
        ])),
    ]));
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value, required this.icon, required this.color});
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(right: 6), padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(color: color.withValues(alpha: .12), borderRadius: BorderRadius.circular(8)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Row(children: [Icon(icon, size: 16, color: color), const SizedBox(width: 6),
      Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800))]),
    const SizedBox(height: 4), Text(label, style: const TextStyle(fontSize: 12)),
  ]));
}

class Library extends StatefulWidget {
  const Library({super.key, required this.study, this.savedOnly = false, this.subject, this.onSubject});
  final Study study;
  final bool savedOnly;
  final String? subject;
  final ValueChanged<String?>? onSubject;
  @override
  State<Library> createState() => _LibraryState();
}

class _LibraryState extends State<Library> {
  String query = '';
  @override
  Widget build(BuildContext context) {
    final study = widget.study;
    final lessons = (widget.savedOnly ? study.saved : study.lessons).where((lesson) =>
      (widget.subject == null || lesson.subjectId == widget.subject) &&
      '${lesson.title} ${lesson.subject} ${lesson.content}'.toLowerCase().contains(query.toLowerCase())).toList();
    return RefreshIndicator(onRefresh: study.load, child: ListView(
      physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.fromLTRB(22, 18, 22, 30), children: [
      Text(widget.savedOnly ? 'Your pocket library.' : 'Find your next discovery.',
        style: const TextStyle(fontSize: 27, height: 1.25, fontWeight: FontWeight.w900)),
      const SizedBox(height: 9), Text(widget.savedOnly ? 'Saved on this device. Ready when you are.' : 'A little curiosity goes a long way.',
        style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, height: 1.5)),
      const SizedBox(height: 22),
      TextField(onChanged: (value) => setState(() => query = value),
        decoration: const InputDecoration(hintText: 'Search lessons', prefixIcon: Icon(Icons.search_rounded))),
      if (!widget.savedOnly) ...[
        const SizedBox(height: 12),
        SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: [
          Padding(padding: const EdgeInsets.only(right: 8), child: ChoiceChip(label: const Text('All subjects'),
            selected: widget.subject == null, onSelected: (_) => widget.onSubject?.call(null))),
          ...study.subjects.map((item) => Padding(padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(label: Text('${item['name']}'), selected: widget.subject == '${item['id']}',
              onSelected: (_) => widget.onSubject?.call('${item['id']}')))),
        ])),
        if (study.error != null) Notice(study.error!, onRetry: study.load),
        if (study.busy) const LinearProgressIndicator(),
      ],
      SectionTitle('${lessons.length} ${lessons.length == 1 ? 'lesson' : 'lessons'}'),
      if (lessons.isEmpty && !study.busy) EmptyState(
        icon: widget.savedOnly ? Icons.bookmark_border_rounded : Icons.search_rounded,
        title: query.isNotEmpty ? 'No matching lessons' : widget.savedOnly ? 'Make room for discovery' : 'No lessons here yet',
        subtitle: query.isNotEmpty ? 'Try another topic or subject.'
          : widget.savedOnly ? 'Your saved lessons will appear here.' : 'Check another subject or try refreshing.'),
      ...lessons.map((lesson) => Padding(padding: const EdgeInsets.only(bottom: 12), child: LessonTile(lesson: lesson, study: study))),
    ]));
  }
}

class LessonTile extends StatelessWidget {
  const LessonTile({super.key, required this.lesson, required this.study});
  final Lesson lesson;
  final Study study;
  @override
  Widget build(BuildContext context) {
    final subject = study.subjects.where((item) => '${item['id']}' == lesson.subjectId).firstOrNull?['name'] ?? lesson.subject;
    return Material(color: Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(8),
      child: InkWell(borderRadius: BorderRadius.circular(8), onTap: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => LessonReader(study: study, lesson: lesson))),
        child: Padding(padding: const EdgeInsets.symmetric(vertical: 17, horizontal: 14), child: Row(children: [
          SubjectIcon('$subject'), const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('$subject'.toUpperCase(), style: const TextStyle(fontSize: 9, color: emerald, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6), Text(lesson.title, style: const TextStyle(fontWeight: FontWeight.w800, height: 1.4)),
            const SizedBox(height: 6), Text('${lesson.minutes} min read${study.completed.contains(lesson.id) ? ' / Read' : ''}',
              style: const TextStyle(fontSize: 11)),
          ])),
          const SizedBox(width: 8),
          Icon(study.completed.contains(lesson.id) ? Icons.check_circle_outline : Icons.chevron_right_rounded,
            color: study.completed.contains(lesson.id) ? emerald : null, size: 21),
        ]))));
  }
}

class LessonReader extends StatelessWidget {
  const LessonReader({super.key, required this.study, required this.lesson});
  final Study study;
  final Lesson lesson;
  Future<void> persist(BuildContext context, Future<void> Function() action) async {
    try {
      await action();
    } catch (_) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not save to this device. Please try again.')));
    }
  }
  @override
  Widget build(BuildContext context) => ListenableBuilder(listenable: study, builder: (context, _) {
    final saved = study.saved.any((item) => item.id == lesson.id);
    final read = study.completed.contains(lesson.id);
    return Scaffold(appBar: AppBar(title: const Text('Your reading space', style: TextStyle(fontSize: 16)), actions: [
      IconButton(tooltip: saved ? 'Remove download' : 'Save offline',
        onPressed: () => persist(context, () => study.toggleSaved(lesson)),
        icon: Icon(saved ? Icons.bookmark : Icons.bookmark_border)), const SizedBox(width: 10),
    ]), body: Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 720),
      child: ListView(padding: const EdgeInsets.all(24), children: [
        Text('${lesson.level} / ${lesson.minutes} min read', style: const TextStyle(color: emerald, fontSize: 12, fontWeight: FontWeight.w700)),
        const SizedBox(height: 14), Text(lesson.title, style: const TextStyle(fontSize: 29, fontWeight: FontWeight.w900, height: 1.25)),
        if (saved) const Padding(padding: EdgeInsets.only(top: 10), child: Row(children: [
          Icon(Icons.offline_pin_outlined, size: 16, color: emerald), SizedBox(width: 6), Text('Available offline', style: TextStyle(fontSize: 12, color: emerald)),
        ])),
        const SizedBox(height: 22), MarkdownBody(data: lesson.content, selectable: true,
          styleSheet: MarkdownStyleSheet.fromTheme(Theme.of(context)).copyWith(p: const TextStyle(fontSize: 16, height: 1.8))),
        const SizedBox(height: 32), FilledButton.icon(onPressed: read ? null : () => persist(context, () => study.complete(lesson)),
          icon: Icon(read ? Icons.check_circle : Icons.check), label: Text(read ? 'Marked as read' : 'Mark as read')),
        const SizedBox(height: 14), OutlinedButton.icon(onPressed: () => Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => Scaffold(appBar: AppBar(title: const Text('ElimuAI tutor')), body: SafeArea(
            child: Tutor(study: study, initialSubject: '${study.subjects.where((item) => '${item['id']}' == lesson.subjectId).firstOrNull?['name'] ?? lesson.subject}'))))),
          icon: const Icon(Icons.auto_awesome, size: 18), label: const Text('Discuss with tutor')),
      ]))),
    );
  });
}

Future<void> account(BuildContext context, Study study) => showModalBottomSheet<void>(
  context: context, showDragHandle: true, isScrollControlled: true, useSafeArea: true,
  builder: (sheetContext) => ListenableBuilder(listenable: study, builder: (context, _) => SingleChildScrollView(
    padding: const EdgeInsets.fromLTRB(24, 8, 24, 30), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(study.name, style: const TextStyle(fontSize: 25, fontWeight: FontWeight.w900)),
      const SizedBox(height: 6), Text('${study.user?['email'] ?? ''}'),
      const SizedBox(height: 8), Text(study.demo ? 'Demo account / Sample curriculum' : '${study.user?['role'] ?? 'Learner'} / ${study.level}'),
      const SizedBox(height: 20), const Divider(),
      SwitchListTile.adaptive(contentPadding: EdgeInsets.zero, title: const Text('Dark appearance'),
        secondary: const Icon(Icons.dark_mode_outlined), value: study.dark, onChanged: (value) async {
          try { await study.setDark(value); } catch (_) {
            if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not save appearance.')));
          }
        }),
      if (study.demo) Padding(padding: const EdgeInsets.symmetric(vertical: 14), child: DropdownButtonFormField<String>(
        initialValue: study.role, decoration: const InputDecoration(labelText: 'Preview account role'),
        items: const [DropdownMenuItem(value: 'student', child: Text('Student')),
          DropdownMenuItem(value: 'parent', child: Text('Parent')), DropdownMenuItem(value: 'teacher', child: Text('Teacher')),
          DropdownMenuItem(value: 'admin', child: Text('School admin')), DropdownMenuItem(value: 'super_admin', child: Text('Platform admin'))],
        onChanged: (value) { if (value != null) study.enterDemo(value); })),
      for (final id in ['profile', 'password', 'sessions', 'subscription']) ListTile(contentPadding: EdgeInsets.zero,
        leading: Icon(features.firstWhere((feature) => feature.id == id).icon),
        title: Text(features.firstWhere((feature) => feature.id == id).title), trailing: const Icon(Icons.chevron_right),
        onTap: () => openFeature(context, study, features.firstWhere((feature) => feature.id == id))),
      const Divider(), const SizedBox(height: 10),
      SizedBox(width: double.infinity, child: OutlinedButton.icon(icon: const Icon(Icons.logout),
        label: Text(study.demo ? 'Leave demo' : 'Sign out'), onPressed: () async {
          Navigator.of(sheetContext).pop();
          try { await study.signOut(); } catch (_) {
            if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Signed out on this device. The server could not be reached.')));
          }
        })),
      const SizedBox(height: 20), const Center(child: Text('ElimuAI / 0.1.0', style: TextStyle(fontSize: 11))),
    ]))),
);