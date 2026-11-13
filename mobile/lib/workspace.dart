import 'package:flutter/material.dart';

import 'feature_views.dart';
import 'features.dart';
import 'learning_tools.dart';
import 'photo_scan.dart';
import 'study.dart';
import 'ui.dart';

Future<void> openFeature(BuildContext context, Study study, AppFeature feature) async {
  if (!feature.visibleTo(study)) return;
  if (feature.id == 'delete-account') {
    if (study.demo) return;
    if (!await confirmAction(context, 'Permanently delete your account?')) return;
    if (!context.mounted) return;
    final result = await Navigator.push<Map<String, dynamic>>(context, MaterialPageRoute(builder: (_) => NativeForm(
      study: study, title: 'Delete account', submitLabel: 'Permanently delete account',
      fields: const [FormFieldSpec('password', 'Confirm your password', required: true, secret: true)],
      submit: (values) => study.api.send('DELETE', '/api/auth/account', values),
    )));
    if (result != null) {
      if (context.mounted) Navigator.of(context).popUntil((route) => route.isFirst);
      await study.signOut(remote: false);
    }
    return;
  }
  final screen = switch (feature.id) {
    'photoscan' => PhotoScanPage(study: study),
    'homework' => HomeworkLab(study: study),
    'exams' => ExamStudio(study: study),
    'insights' => SchoolInsights(study: study),
    _ => FeaturePage(study: study, feature: feature),
  };
  await Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
}

class Workspace extends StatefulWidget {
  const Workspace({super.key, required this.study, this.overview = false});
  final Study study;
  final bool overview;
  @override
  State<Workspace> createState() => _WorkspaceState();
}

class _WorkspaceState extends State<Workspace> {
  String search = '';
  @override
  Widget build(BuildContext context) {
    final study = widget.study;
    final available = featuresFor(study);
    const personal = {'subscription', 'invoices', 'payments', 'profile', 'grade', 'password', 'sessions', 'delete-account'};
    const learning = {'photoscan', 'homework', 'exams', 'progress', 'achievements', 'leaderboard', 'exam-history'};
    final groups = <(String, List<AppFeature>)>[
      (study.role == 'parent' ? 'Your family' : study.isStaff ? 'Your workspace' : 'Keep exploring',
        available.where((feature) => !personal.contains(feature.id) && !learning.contains(feature.id)).toList()),
      ('Learning & discovery', available.where((feature) => learning.contains(feature.id)).toList()),
      ('Account & billing', available.where((feature) => personal.contains(feature.id)).toList()),
    ];
    final title = widget.overview ? switch (study.role) {
      'teacher' => 'Great teaching starts here.', 'parent' => 'Growing together.',
      'admin' => 'A school full of possibility.', 'super_admin' => 'Your ElimuAI command centre.',
      _ => 'A world to explore.',
    } : '${study.workspaceTitle} hub';
    final accent = switch (study.role) { 'teacher' => sky, 'parent' => orange, 'admin' => emerald, 'super_admin' => purple, _ => emerald };
    return ListView(padding: const EdgeInsets.fromLTRB(20, 18, 20, 30), children: [
      Container(padding: const EdgeInsets.all(22), color: accent, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [Icon(switch (study.role) { 'parent' => Icons.family_restroom, 'teacher' => Icons.co_present,
          'admin' => Icons.domain, _ => Icons.explore }, color: Colors.white, size: 28),
          const SizedBox(width: 10), Expanded(child: Text('${study.demo ? 'DEMO / ' : ''}${study.role.replaceAll('_', ' ').toUpperCase()}',
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 10)))]),
        const SizedBox(height: 18), Text(title, style: const TextStyle(color: Colors.white, fontSize: 27, height: 1.25, fontWeight: FontWeight.w900)),
        const SizedBox(height: 10), Text('Welcome, ${study.name.split(' ').first}.', style: const TextStyle(color: Colors.white, height: 1.5)),
      ])),
      const SizedBox(height: 20), TextField(onChanged: (value) => setState(() => search = value.toLowerCase()),
        decoration: const InputDecoration(hintText: 'Find a tool', prefixIcon: Icon(Icons.search_rounded))),
      for (final (label, items) in groups) if (items.any((feature) => '${feature.title} ${feature.description}'.toLowerCase().contains(search))) ...[
        SectionTitle(label),
        LayoutBuilder(builder: (context, constraints) {
          final columns = constraints.maxWidth >= 650 ? 3 : 2;
          final width = (constraints.maxWidth - 12 * (columns - 1)) / columns;
          return Wrap(spacing: 12, runSpacing: 12, children: items
            .where((feature) => '${feature.title} ${feature.description}'.toLowerCase().contains(search)).map((feature) =>
              SizedBox(width: width, child: Material(color: feature.color.withValues(alpha: .13),
                borderRadius: BorderRadius.circular(8), child: InkWell(borderRadius: BorderRadius.circular(8),
                  onTap: () => openFeature(context, study, feature), child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 165), child: Padding(padding: const EdgeInsets.all(16),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Icon(feature.icon, color: feature.color, size: 30), const SizedBox(height: 18),
                        Text(feature.title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, height: 1.3)),
                        const SizedBox(height: 7), Text(feature.description, style: const TextStyle(fontSize: 11, height: 1.5)),
                      ]))))))).toList());
        }),
      ],
      if (!available.any((feature) => '${feature.title} ${feature.description}'.toLowerCase().contains(search)))
        const EmptyState(icon: Icons.search_rounded, title: 'No matching tools', subtitle: 'Try a different search.'),
    ]);
  }
}