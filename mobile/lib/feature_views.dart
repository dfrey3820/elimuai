import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'features.dart';
import 'api.dart';
import 'record_details.dart';
import 'study.dart';
import 'ui.dart';

Future<void> resultDialog(BuildContext context, Map<String, dynamic> result) async {
  final child = result['child'];
  final password = result['tempPassword'] ?? result['temp_password'] ??
    (child is Map ? child['tempPassword'] : null);
  await showDialog<void>(context: context, builder: (context) => AlertDialog(
    title: Text(password == null ? 'Done' : 'Account created'),
    content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('${result['message'] ?? 'Your changes have been saved.'}'),
      if (result['errors'] is List && (result['errors'] as List).isNotEmpty)
        RecordFacts(result['errors']),
      if (result['skipped'] is List && (result['skipped'] as List).isNotEmpty)
        RecordFacts(result['skipped']),
      if (password != null) ...[
        const SizedBox(height: 16), const Text('Temporary password', style: TextStyle(fontWeight: FontWeight.w800)),
        const SizedBox(height: 8), SelectableText('$password'),
        const SizedBox(height: 8), const Text('Share securely with the account owner. It will not be stored in this app.'),
      ],
    ])),
    actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close'))],
  ));
}

Map<String, dynamic> demoData(String id) => switch (id) {
  'children' => {'children': [{'id': 'demo-child', 'name': 'Amani', 'grade_level': 'Grade 7',
    'total_xp': 420, 'streak_days': 4, 'today_sessions': 2}]},
  'classes' => {'classes': [{'id': 'demo-class', 'name': 'Grade 7 / Acacia', 'subject': 'Mathematics',
    'grade_level': 'Grade 7', 'student_count': 28}]},
  'students' => {'students': [{'id': 'demo-student', 'name': 'Amani Kamau', 'grade_level': 'Grade 7',
    'email': 'learner@example.com', 'total_xp': 420, 'is_active': true}]},
  'teachers' => {'teachers': [{'id': 'demo-teacher', 'name': 'Ms. Wanjiku', 'subject': 'Mathematics',
    'email': 'teacher@example.com', 'is_active': true}]},
  'progress' => {'streak': 4, 'total_xp': 420, 'week_xp': 150, 'week_mins': 65,
    'subjects': [{'name': 'Mathematics', 'avg_score': 82, 'attempts': 3}],
    'recent_activity': [{'activity_type': 'exam_complete', 'xp_earned': 30, 'score': 82}]},
  'achievements' => {'achievements': [{'name': 'First steps', 'description': 'Complete your first learning session.', 'earned': true, 'xp_reward': 20},
    {'name': 'Keep the spark', 'description': 'Learn on seven consecutive days.', 'earned': false, 'xp_reward': 100}]},
  'leaderboard' => {'leaderboard': [{'rank': 1, 'name': 'Amani', 'xp': 420, 'streak': 4}, {'rank': 2, 'name': 'Alex', 'xp': 380, 'streak': 3}]},
  'school' => {'school': {'name': 'Acacia Academy', 'student_count': 210, 'teacher_count': 12, 'avg_score': 78}},
  'subscription' => {'plan': 'Trial', 'aiEnabled': true, 'trialDaysRemaining': 5},
  'platform' => {'total_users': 1240, 'total_schools': 18, 'active_subscriptions': 320},
  'users' => {'users': [
    {'id': 'demo-learner', 'name': 'Amani Wanjiku', 'email': 'amani@example.com', 'role': 'student',
      'grade_level': 'Grade 7', 'curriculum': 'CBC', 'country': 'KE', 'language': 'en',
      'is_active': true, 'email_verified': true, 'plan': 'student', 'total_xp': 420, 'streak_days': 4},
    {'id': 'demo-teacher', 'name': 'Ms. Wanjiku', 'email': 'teacher@example.com', 'role': 'teacher',
      'is_active': true, 'email_verified': true, 'plan': 'teacher', 'total_xp': 150, 'streak_days': 2},
  ], 'total': 2},
  _ => {},
};

class FeaturePage extends StatefulWidget {
  const FeaturePage({super.key, required this.study, required this.feature});
  final Study study;
  final AppFeature feature;
  @override
  State<FeaturePage> createState() => _FeaturePageState();
}

class _FeaturePageState extends State<FeaturePage> {
  Map<String, dynamic>? data;
  String? error;
  String search = '';
  int page = 1;
  bool loading = false;
  String period = 'weekly';
  String scope = 'global';
  String userRole = '';
  Timer? searchTimer;
  AppFeature get feature => widget.feature;

  @override
  void initState() { super.initState(); load(); }

  Future<void> load() async {
    if (!feature.visibleTo(widget.study)) return;
    setState(() { loading = true; error = null; });
    try {
      final response = widget.study.demo ? feature.id == 'profile' ? {'user': widget.study.user} : demoData(feature.id)
        : feature.id == 'password' ? <String, dynamic>{}
        : await widget.study.api.get(feature.endpoint(widget.study), {
          if (feature.paginated) ...{'page': '$page', 'limit': '20'},
          if (feature.id == 'users' && search.isNotEmpty) 'search': search,
          if (feature.id == 'users' && userRole.isNotEmpty) 'role': userRole,
          if (feature.id == 'leaderboard') ...{'scope': scope, 'period': period, 'limit': '50'},
          if (feature.id == 'rankings') 'period': period,
        });
      if (mounted) setState(() => data = response);
    } catch (failure) {
      if (mounted) setState(() => error = '$failure');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  void dispose() { searchTimer?.cancel(); super.dispose(); }

  Future<void> form([Map<String, dynamic>? record]) async {
    if (widget.study.demo) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sign in to make changes. Demo data is read-only.')));
      return;
    }
    final initial = record ?? (feature.id == 'profile' ? Map<String, dynamic>.from(data?['user'] ?? {}) : <String, dynamic>{});
    final result = await Navigator.push<Map<String, dynamic>>(context, MaterialPageRoute(builder: (_) => NativeForm(
      study: widget.study, title: record == null ? feature.title : 'Edit ${feature.title.toLowerCase()}',
      fields: feature.fields, initial: initial,
      submit: (values) => widget.study.api.send(record == null ? feature.createMethod : 'PUT',
        record == null ? feature.createPath! : '${feature.createPath}/${Uri.encodeComponent('${record['id']}')}',
        feature.payload(values)),
    )));
    if (!mounted || result == null) return;
    if ((feature.id == 'profile' || feature.id == 'grade') && result['user'] is Map) {
      widget.study.user = Map<String, dynamic>.from(result['user']);
      await widget.study.load();
    }
    if (mounted) await resultDialog(context, result);
    if (mounted) await load();
  }

  @override
  Widget build(BuildContext context) {
    if (!feature.visibleTo(widget.study)) {
      return const Scaffold(body: SafeArea(child: EmptyState(icon: Icons.lock_outline,
        title: 'Not available for this account', subtitle: 'Use an account with the appropriate role.')));
    }
    final content = feature.key == null ? data : data?[feature.key];
    final records = content is List ? content.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList() : <Map<String, dynamic>>[];
    final filtered = records.where((item) =>
      (feature.id != 'users' || !widget.study.demo || userRole.isEmpty || item['role'] == userRole) &&
      item.values.whereType<String>().join(' ').toLowerCase().contains(search.toLowerCase())).toList();
    return Scaffold(
      appBar: AppBar(title: Text(feature.title, style: const TextStyle(fontSize: 18)), actions: [
        IconButton(onPressed: loading ? null : load, tooltip: 'Refresh', icon: const Icon(Icons.refresh_rounded)),
      ]),
      floatingActionButton: feature.createPath == null ? null : FloatingActionButton(
        onPressed: () => form(), tooltip: feature.id == 'profile' || feature.id == 'password' ? 'Edit' : 'Add',
        backgroundColor: feature.color, foregroundColor: Colors.white,
        child: Icon(feature.id == 'profile' || feature.id == 'password' ? Icons.edit_outlined : Icons.add)),
      body: RefreshIndicator(onRefresh: load, child: ListView(physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 90), children: [
          Row(children: [Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(
            color: feature.color, borderRadius: BorderRadius.circular(8)), child: Icon(feature.icon, color: Colors.white, size: 28)),
            const SizedBox(width: 14), Expanded(child: Text(feature.description,
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, height: 1.4)))]),
          if (widget.study.demo) const Notice('Demo / sample records. Changes are disabled.'),
          if (feature.id == 'users') ...[
            const SizedBox(height: 16), SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: [
              for (final role in ['', 'student', 'teacher', 'parent', 'admin', 'super_admin']) Padding(
                padding: const EdgeInsets.only(right: 8), child: ChoiceChip(label: Text(role.isEmpty ? 'All roles' : friendlyLabel(role)),
                  selected: userRole == role, onSelected: loading ? null : (_) { setState(() { userRole = role; page = 1; }); load(); })),
            ])),
          ],
          if (feature.id == 'leaderboard' || feature.id == 'rankings') ...[
            const SizedBox(height: 18), Wrap(spacing: 8, children: [
              for (final value in ['weekly', 'monthly', 'all_time']) ChoiceChip(
                label: Text(value == 'all_time' ? 'All time' : friendlyLabel(value)), selected: period == value,
                onSelected: loading ? null : (_) { setState(() => period = value); load(); }),
            ]),
            if (feature.id == 'leaderboard') Wrap(spacing: 8, children: [
              for (final value in ['global', 'country', 'school']) ChoiceChip(label: Text(friendlyLabel(value)),
                selected: scope == value, onSelected: loading ? null : (_) { setState(() => scope = value); load(); }),
            ]),
          ],
          if (loading) const Padding(padding: EdgeInsets.symmetric(vertical: 22), child: LinearProgressIndicator()),
          if (error != null) Notice(error!, onRetry: load, icon: Icons.error_outline),
          if (records.isNotEmpty || feature.id == 'users') ...[
            const SizedBox(height: 20), TextField(onChanged: (value) {
              setState(() => search = value);
              if (feature.id == 'users' && !widget.study.demo) {
                searchTimer?.cancel();
                searchTimer = Timer(const Duration(milliseconds: 350), () {
                  if (mounted) { setState(() => page = 1); load(); }
                });
              }
            }, decoration: InputDecoration(hintText: feature.id == 'users' ? 'Search users by name or email' : 'Search these records', prefixIcon: const Icon(Icons.search))),
            const SizedBox(height: 16),
          ],
          if (records.isNotEmpty) ...[
            ...filtered.map((record) => Padding(padding: const EdgeInsets.only(bottom: 10),
              child: Material(color: feature.color.withValues(alpha: .10), borderRadius: BorderRadius.circular(8),
                child: const {'users', 'students', 'teachers', 'children'}.contains(feature.id)
                  ? PersonListItem(person: record, color: feature.color, onTap: () async {
                    await Navigator.push(context, MaterialPageRoute(builder: (_) => RecordPage(
                      study: widget.study, feature: feature, record: record, onEdit: () => form(record))));
                    if (mounted) load();
                  })
                  : ListTile(contentPadding: const EdgeInsets.all(14),
                  leading: Icon(feature.icon, color: feature.color),
                  title: Text(recordTitle(record), style: const TextStyle(fontWeight: FontWeight.w800)),
                  subtitle: Text(recordSubtitle(record), maxLines: 3, overflow: TextOverflow.ellipsis),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () async {
                    await Navigator.push(context, MaterialPageRoute(builder: (_) => RecordPage(
                      study: widget.study, feature: feature, record: record, onEdit: () => form(record))));
                    if (mounted) load();
                  })))),
            if (filtered.isEmpty) const EmptyState(icon: Icons.search, title: 'No matches', subtitle: 'Try a different search.'),
          ] else if (!loading && error == null) ...[
            const SizedBox(height: 20),
            if (content is Map && content.isNotEmpty)
              if (const {'profile', 'grade'}.contains(feature.id))
                PersonDetails(record: Map<String, dynamic>.from(content))
              else if (const {'progress', 'school', 'platform', 'subscription'}.contains(feature.id))
                SummaryDetails(id: feature.id, data: Map<String, dynamic>.from(content))
              else RecordFacts(content)
            else if (feature.id == 'password') FilledButton.icon(onPressed: () => form(), icon: const Icon(Icons.lock_reset), label: const Text('Change password'))
            else const EmptyState(icon: Icons.inbox_outlined, title: 'Nothing here yet', subtitle: 'New records will appear here.'),
          ],
          if (feature.paginated) Padding(padding: const EdgeInsets.only(top: 18), child: Row(children: [
            IconButton(tooltip: 'Previous page', onPressed: page == 1 || loading ? null : () { setState(() => page--); load(); }, icon: const Icon(Icons.arrow_back)),
            Expanded(child: Text('Page $page / ${data?['total'] ?? '—'} records', textAlign: TextAlign.center)),
            IconButton(tooltip: 'Next page', onPressed: records.length < 20 || loading ? null : () { setState(() => page++); load(); }, icon: const Icon(Icons.arrow_forward)),
          ])),
          if (feature.id == 'sessions') TextButton.icon(icon: const Icon(Icons.logout), label: const Text('Sign out all other devices'),
            onPressed: widget.study.demo ? null : () async {
              if (!await confirmAction(context, 'Sign out all other devices?')) return;
              try {
                final result = await widget.study.api.post('/api/auth/sessions/revoke-all', {});
                if (context.mounted) await resultDialog(context, result);
                await load();
              } catch (failure) { if (mounted) setState(() => error = '$failure'); }
            }),
        ])),
    );
  }
}

String recordTitle(Map<String, dynamic> record) => '${record['name'] ?? record['title'] ?? record['paper_title'] ?? record['invoice_number'] ??
  record['invoiceNumber'] ?? record['user_agent'] ?? record['subject_name'] ?? record['activity_type'] ?? record['status'] ?? 'Record'}';

String recordSubtitle(Map<String, dynamic> record) => [
  record['grade_level'], record['subject'], record['email'],
  if (record['student_count'] != null) '${record['student_count']} learners',
  if (record['total_xp'] != null) '${record['total_xp']} XP',
  if (record['xp'] != null) '${record['xp']} XP',
  if (record['amount'] != null) '${record['currency'] ?? 'KES'} ${record['amount']}',
  if (record['score'] != null) 'Score ${record['score']}/${record['total'] ?? '100'}',
  if (record['earned'] != null) record['earned'] == true ? 'Earned' : 'In progress',
  record['description'], record['status'],
].where((value) => value != null && '$value'.isNotEmpty).join(' / ');

class RecordFacts extends StatelessWidget {
  const RecordFacts(this.value, {super.key});
  final dynamic value;
  @override
  Widget build(BuildContext context) {
    if (value is List) {
      return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        for (final item in value) Padding(padding: const EdgeInsets.only(bottom: 12), child: RecordFacts(item)),
      ]);
    }
    if (value is! Map) return SelectableText(value == null ? '—' : '$value', style: const TextStyle(height: 1.6));
    const hidden = {'id', 'school_id', 'user_id', 'created_by', 'teacher_id', 'subject_id',
      'password_hash', 'token', 'accessToken', 'refreshToken', 'tempPassword', 'temp_password'};
    final entries = (value as Map).entries.where((entry) => !hidden.contains(entry.key) && entry.value != null).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: entries.map((entry) =>
      Padding(padding: const EdgeInsets.symmetric(vertical: 9), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(friendlyLabel('${entry.key}'), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800,
          color: Theme.of(context).colorScheme.onSurfaceVariant)), const SizedBox(height: 5),
        if (entry.value is Map || entry.value is List) RecordFacts(entry.value)
        else SelectableText(entry.value is bool ? entry.value == true ? 'Yes' : 'No' : '${entry.value}',
          style: const TextStyle(fontSize: 15, height: 1.6)),
      ]))).toList());
  }
}

Future<bool> confirmAction(BuildContext context, String title) async =>
  await showDialog<bool>(context: context, builder: (context) => AlertDialog(title: Text(title),
    content: const Text('This changes the live account. Continue?'), actions: [
      TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
      FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Confirm')),
    ])) ?? false;

class RecordPage extends StatefulWidget {
  const RecordPage({super.key, required this.study, required this.feature, required this.record, required this.onEdit});
  final Study study;
  final AppFeature feature;
  final Map<String, dynamic> record;
  final Future<void> Function() onEdit;
  @override
  State<RecordPage> createState() => _RecordPageState();
}

class _RecordPageState extends State<RecordPage> {
  Map<String, dynamic>? detail;
  String? error;
  bool busy = false;
  bool get isPerson => const {'users', 'students', 'teachers', 'children'}.contains(widget.feature.id);
  Map<String, dynamic> get person => {...widget.record,
    if (detail?['user'] is Map) ...Map<String, dynamic>.from(detail!['user']),
    if (detail?['student'] is Map) ...Map<String, dynamic>.from(detail!['student']),
  };
  bool get canManageUser => widget.feature.id == 'users' && widget.study.role == 'super_admin';
  bool get isSelf => '${person['id']}' == '${widget.study.user?['id']}';
  @override
  void initState() { super.initState(); load(); }
  Future<void> load() async {
    if (!widget.feature.visibleTo(widget.study)) return;
    if (widget.study.demo && widget.feature.id == 'users') {
      setState(() => detail = {'user': widget.record,
        'activity': [{'activity_type': 'exam_complete', 'score': 82, 'xp_earned': 20, 'logged_date': '2026-10-29'}],
        'payments': [], 'invoices': [], 'aiSessions': [], 'aiStats': {'total_sessions': 3, 'total_messages': 12, 'total_ai_xp': 40}});
      return;
    }
    if (widget.feature.detailPath == null || widget.study.demo) return;
    setState(() { busy = true; error = null; });
    try {
      final result = await widget.study.api.get(widget.feature.detailPath!.replaceAll('{id}', Uri.encodeComponent('${widget.record['id']}')));
      if (mounted) setState(() => detail = result);
    } catch (failure) { if (mounted) setState(() => error = '$failure'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> act(RecordAction action) async {
    if (busy || widget.study.demo || !widget.feature.visibleTo(widget.study) || !action.roles.contains(widget.study.role)) return;
    if (action.confirm && !await confirmAction(context, '${action.label}?')) return;
    setState(() { busy = true; error = null; });
    try {
      final result = await widget.study.api.send(action.method,
        '${widget.feature.endpoint(widget.study)}/${Uri.encodeComponent('${widget.record['id']}')}${action.suffix}', {});
      if (mounted) { await resultDialog(context, result); }
      if (mounted && isPerson) {
        await load();
        if (result['user'] is Map && mounted) setState(() => detail = {...?detail, 'user': {...person, ...Map<String, dynamic>.from(result['user'])}});
      } else if (mounted) {
        Navigator.pop(context);
      }
    } catch (failure) { if (mounted) setState(() => error = '$failure'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> manage(String kind) async {
    if (!canManageUser || widget.study.demo || busy || (kind == 'role' && isSelf)) return;
    final fields = kind == 'role' ? const [FormFieldSpec('role', 'Account role', required: true,
      options: ['student', 'parent', 'teacher', 'admin', 'super_admin'])]
      : const [FormFieldSpec('plan', 'Subscription plan', required: true,
        options: ['free', 'student', 'teacher', 'parent', 'family', 'school', 'enterprise']),
        FormFieldSpec('days', 'Access duration (days)', required: true, numeric: true)];
    final result = await Navigator.push<Map<String, dynamic>>(context, MaterialPageRoute(builder: (_) => NativeForm(
      study: widget.study, title: kind == 'role' ? 'Change account role' : 'Manage subscription', fields: fields,
      initial: {...person, 'days': 30}, submit: (values) async {
        if (kind == 'subscription') {
          final days = values['days'];
          if (days is! int || days < 1 || days > 3650) throw const ApiException('Choose a whole number of days between 1 and 3650.');
        }
        if (!await confirmAction(context, 'Update ${kind == 'role' ? 'role' : 'subscription'} for ${person['name']}?')) {
          throw const ApiException('No changes were made.');
        }
        return widget.study.api.send('PUT', '${widget.feature.endpoint(widget.study)}/${Uri.encodeComponent('${person['id']}')}/$kind', values);
      },
    )));
    if (!mounted || result == null) return;
    await resultDialog(context, result);
    if (mounted) await load();
  }

  List<Widget> get personActions => [
    for (final action in widget.feature.actions.where((action) => action.roles.contains(widget.study.role)))
      OutlinedButton.icon(onPressed: busy || widget.study.demo ||
          (action.suffix == '/toggle-active' && isSelf) ? null : () => act(action),
        icon: Icon(action.icon), label: Text(action.suffix == '/toggle-active'
          ? recordFlag(person['is_active']) ? 'Deactivate account' : 'Activate account'
          : action.label)),
    if (canManageUser) ...[
      OutlinedButton.icon(onPressed: busy || widget.study.demo || isSelf ? null : () => manage('role'),
        icon: const Icon(Icons.admin_panel_settings_outlined), label: const Text('Change role')),
      OutlinedButton.icon(onPressed: busy || widget.study.demo ? null : () => manage('subscription'),
        icon: const Icon(Icons.card_membership_outlined), label: const Text('Manage subscription')),
    ],
  ];
  @override
  Widget build(BuildContext context) => !widget.feature.visibleTo(widget.study)
    ? const Scaffold(body: SafeArea(child: EmptyState(icon: Icons.lock_outline,
      title: 'Not available for this account', subtitle: 'Use an account with the appropriate role.')))
    : Scaffold(appBar: AppBar(title: Text(recordTitle(widget.record),
    maxLines: 1, overflow: TextOverflow.ellipsis)), body: ListView(padding: const EdgeInsets.all(22), children: [
      if (busy) const LinearProgressIndicator(),
      if (widget.study.demo) const Notice('Demo / sample records. Changes are disabled.'),
      if (error != null) Notice(error!, onRetry: load),
      if (isPerson) PersonDetails(record: {'role': widget.feature.id == 'teachers' ? 'teacher' : 'student', ...widget.record},
        detail: detail, actions: personActions)
      else if (widget.feature.id == 'invoices' || widget.feature.id == 'payments' || widget.feature.id == 'transactions') ...[
        FinancialRow(record: widget.record, invoice: widget.feature.id == 'invoices'),
        RecordFacts(detail ?? widget.record),
      ] else RecordFacts(detail ?? widget.record),
      const SizedBox(height: 20),
      if (widget.feature.edit) FilledButton.icon(onPressed: busy || widget.study.demo ? null : () async {
        Navigator.pop(context); await widget.onEdit();
      }, icon: const Icon(Icons.edit), label: const Text('Edit')),
      if (!isPerson) ...widget.feature.actions.where((action) => action.roles.contains(widget.study.role) &&
        !(widget.feature.id == 'sessions' && widget.record['is_current'] == true)).map((action) =>
        Padding(padding: const EdgeInsets.only(top: 10), child: OutlinedButton.icon(
          onPressed: busy || widget.study.demo ? null : () => act(action), icon: Icon(action.icon), label: Text(action.label)))),
      if (widget.feature.remove) TextButton.icon(icon: const Icon(Icons.delete_outline), label: const Text('Delete lesson'),
        onPressed: busy || widget.study.demo ? null : () async {
          if (!await confirmAction(context, 'Delete this lesson?')) return;
          setState(() => busy = true);
          try {
            await widget.study.api.send('DELETE', '${widget.feature.createPath}/${Uri.encodeComponent('${widget.record['id']}')}');
            if (context.mounted) Navigator.pop(context);
          } catch (failure) { if (mounted) setState(() { error = '$failure'; busy = false; }); }
        }),
    ]));
}

class NativeForm extends StatefulWidget {
  const NativeForm({super.key, required this.study, required this.title, required this.fields,
    required this.submit, this.initial = const {}, this.submitLabel = 'Save'});
  final Study study;
  final String title;
  final List<FormFieldSpec> fields;
  final Map<String, dynamic> initial;
  final String submitLabel;
  final Future<Map<String, dynamic>> Function(Map<String, dynamic>) submit;
  @override
  State<NativeForm> createState() => _NativeFormState();
}

class _NativeFormState extends State<NativeForm> {
  final form = GlobalKey<FormState>();
  final Map<String, TextEditingController> controllers = {};
  final Map<String, List<Map<String, dynamic>>> lookups = {};
  final Map<String, String?> selected = {};
  bool busy = false;
  bool fetching = false;
  String? error;
  @override
  void initState() {
    super.initState();
    for (final field in widget.fields) {
      controllers[field.key] = TextEditingController(text: '${widget.initial[field.key] ?? ''}');
      selected[field.key] = widget.initial[field.key]?.toString();
    }
    loadOptions();
  }

  Future<void> loadOptions() async {
    final fields = widget.fields.where((field) => field.lookup != null).toList();
    if (fields.isEmpty) return;
    setState(() => fetching = true);
    try {
      for (final field in fields) {
        final response = await widget.study.api.get(field.lookup!);
        lookups[field.key] = (response[field.lookupKey] as List? ?? []).whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item)).toList();
      }
    } catch (failure) { if (mounted) setState(() => error = '$failure'); }
    finally { if (mounted) setState(() => fetching = false); }
  }

  Future<void> save() async {
    if (busy || fetching || !form.currentState!.validate()) return;
    setState(() { busy = true; error = null; });
    try {
      final values = <String, dynamic>{};
      for (final field in widget.fields) {
        final value = field.options != null || field.lookup != null ? selected[field.key] ?? ''
          : field.secret ? controllers[field.key]!.text : controllers[field.key]!.text.trim();
        if (value.isNotEmpty) values[field.key] = field.numeric ? num.parse(value) : value;
      }
      final result = await widget.submit(values);
      if (mounted) Navigator.pop(context, result);
    } catch (failure) { if (mounted) setState(() => error = '$failure'); }
    finally { if (mounted) setState(() => busy = false); }
  }

  @override
  void dispose() { for (final controller in controllers.values) { controller.dispose(); } super.dispose(); }

  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: Text(widget.title, style: const TextStyle(fontSize: 18))),
    body: SafeArea(child: Form(key: form, child: ListView(padding: EdgeInsets.fromLTRB(22, 20, 22, 24 + MediaQuery.viewInsetsOf(context).bottom), children: [
      if (fetching) const LinearProgressIndicator(),
      ...widget.fields.map((field) {
        String? validate(String? value) {
          if ((value == null || value.trim().isEmpty)) return field.required ? '${field.label} is required.' : null;
          if (field.minLength > value.length) return 'Use at least ${field.minLength} characters.';
          if (field.key == 'email' && !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value)) return 'Enter a valid email address.';
          if (field.numeric && num.tryParse(value) == null) return 'Enter a valid number.';
          return null;
        }
        final options = field.options;
        final lookup = lookups[field.key] ?? [];
        final choices = options?.map((value) => DropdownMenuItem(value: value, child: Text(value))).toList()
          ?? lookup.map((item) => DropdownMenuItem(value: '${item['id']}', child: Text('${item['name']}', overflow: TextOverflow.ellipsis))).toList();
        final validValue = choices.any((item) => item.value == selected[field.key]) ? selected[field.key] : null;
        return Padding(padding: const EdgeInsets.only(bottom: 16), child: field.options != null || field.lookup != null
          ? DropdownButtonFormField<String>(initialValue: validValue, isExpanded: true,
            decoration: InputDecoration(labelText: field.label), items: choices, validator: validate,
            onChanged: busy ? null : (value) => selected[field.key] = value)
          : TextFormField(controller: controllers[field.key], enabled: !busy, obscureText: field.secret,
            minLines: field.secret ? 1 : field.lines, maxLines: field.secret ? 1 : field.lines,
            autocorrect: !field.secret, enableSuggestions: !field.secret,
            keyboardType: field.numeric ? TextInputType.number : field.key == 'email' ? TextInputType.emailAddress
              : field.key == 'phone' ? TextInputType.phone : field.lines > 1 ? TextInputType.multiline : TextInputType.text,
            inputFormatters: field.numeric ? [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))] : null,
            decoration: InputDecoration(labelText: field.label), validator: validate));
      }),
      if (error != null) Notice(error!, icon: Icons.error_outline),
      FilledButton.icon(onPressed: busy || fetching ? null : save, icon: busy
        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.check),
        label: Text(widget.submitLabel)),
    ]))),
  );
}