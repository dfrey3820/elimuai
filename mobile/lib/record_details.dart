import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'ui.dart';

String displayValue(dynamic value) {
  if (value == null || '$value'.trim().isEmpty) return 'Not provided';
  return '$value';
}

bool recordFlag(dynamic value) => value == true || value == 1 || '$value'.toLowerCase() == 'true';

String readableDate(BuildContext context, dynamic value) {
  final date = DateTime.tryParse('$value');
  if (date == null) return value == null ? 'Not recorded' : '$value';
  return MaterialLocalizations.of(context).formatMediumDate(date.toLocal());
}

class DetailBadge extends StatelessWidget {
  const DetailBadge(this.label, {super.key, this.color = emerald, this.icon});
  final String label;
  final Color color;
  final IconData? icon;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(color: color.withValues(alpha: .13), borderRadius: BorderRadius.circular(6)),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      if (icon != null) ...[Icon(icon, color: color, size: 14), const SizedBox(width: 5)],
      Flexible(child: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w800))),
    ]),
  );
}

class DetailMetric extends StatelessWidget {
  const DetailMetric({super.key, required this.label, required this.value, required this.icon, required this.color});
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: color.withValues(alpha: .10), borderRadius: BorderRadius.circular(8)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(icon, color: color, size: 22), const SizedBox(height: 12),
      Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
      const SizedBox(height: 4), Text(label, style: const TextStyle(fontSize: 11, height: 1.4)),
    ]));
}

class MetricStrip extends StatelessWidget {
  const MetricStrip({super.key, required this.metrics});
  final List<DetailMetric> metrics;
  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, constraints) {
    final columns = constraints.maxWidth >= 600 ? 4 : constraints.maxWidth < 300 ? 2 : 3;
    final width = (constraints.maxWidth - 10 * (columns - 1)) / columns;
    return Wrap(spacing: 10, runSpacing: 10, children: metrics.map((metric) => SizedBox(width: width, child: metric)).toList());
  });
}

class DetailField extends StatelessWidget {
  const DetailField(this.label, this.value, {super.key, this.icon = Icons.info_outline, this.copy = false});
  final String label;
  final String value;
  final IconData icon;
  final bool copy;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Row(
    crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(icon, color: Theme.of(context).colorScheme.onSurfaceVariant, size: 20), const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant)),
        const SizedBox(height: 5), SelectableText(value, style: const TextStyle(fontWeight: FontWeight.w700, height: 1.5)),
      ])),
      if (copy && value != 'Not provided') IconButton(tooltip: 'Copy $label', icon: const Icon(Icons.copy_outlined, size: 18),
        onPressed: () async {
          await Clipboard.setData(ClipboardData(text: value));
          if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$label copied.')));
        }),
    ]));
}

class PersonDetails extends StatefulWidget {
  const PersonDetails({super.key, required this.record, this.detail, this.actions = const []});
  final Map<String, dynamic> record;
  final Map<String, dynamic>? detail;
  final List<Widget> actions;
  @override
  State<PersonDetails> createState() => _PersonDetailsState();
}

class _PersonDetailsState extends State<PersonDetails> {
  String tab = 'Overview';
  @override
  Widget build(BuildContext context) {
    final detail = widget.detail ?? {};
    final raw = detail['user'] ?? detail['student'];
    final person = {...widget.record, if (raw is Map) ...Map<String, dynamic>.from(raw)};
    final name = displayValue(person['name']);
    final role = '${person['role'] ?? 'Learner'}'.replaceAll('_', ' ');
    final activity = _records(detail['activity']);
    final payments = _records(detail['payments']);
    final invoices = _records(detail['invoices']);
    final sessions = _records(detail['aiSessions']);
    final aiStats = detail['aiStats'] is Map ? Map<String, dynamic>.from(detail['aiStats']) : <String, dynamic>{};
    final tabs = ['Overview', if (detail.containsKey('activity')) 'Activity',
      if (detail.containsKey('payments') || detail.containsKey('invoices')) 'Billing',
      if (detail.containsKey('aiSessions')) 'AI sessions'];
    final selected = tabs.contains(tab) ? tab : tabs.first;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Container(padding: const EdgeInsets.all(20), decoration: const BoxDecoration(
        color: Color(0xFF176B59), border: Border(bottom: BorderSide(color: sunshine, width: 4))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            CircleAvatar(radius: 28, backgroundColor: sunshine,
              child: Text(name.split(' ').where((part) => part.isNotEmpty).take(2).map((part) => part[0]).join().toUpperCase(),
                style: const TextStyle(color: Color(0xFF244035), fontWeight: FontWeight.w900, fontSize: 22))),
            const SizedBox(width: 14), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name, style: const TextStyle(color: Colors.white, fontSize: 23, height: 1.3, fontWeight: FontWeight.w900)),
              const SizedBox(height: 6), Text(role.toUpperCase(), style: const TextStyle(color: Color(0xFFC6F2DF), fontSize: 10, fontWeight: FontWeight.w800)),
            ])),
          ]),
          const SizedBox(height: 18), Wrap(spacing: 8, runSpacing: 8, children: [
            if (person['is_active'] != null) DetailBadge(recordFlag(person['is_active']) ? 'Active account' : 'Account disabled',
              color: sunshine, icon: recordFlag(person['is_active']) ? Icons.check_circle_outline : Icons.pause_circle_outline),
            if (person['email_verified'] != null) DetailBadge(recordFlag(person['email_verified']) ? 'Email verified' : 'Email unverified',
              color: const Color(0xFFBDEFD9), icon: recordFlag(person['email_verified']) ? Icons.verified_outlined : Icons.mail_outline),
            if (person['plan'] != null) DetailBadge('${person['plan']}'.toUpperCase(), color: Colors.white, icon: Icons.card_membership_outlined),
          ]),
        ])),
      const SizedBox(height: 18), MetricStrip(metrics: [
        DetailMetric(label: 'Learning XP', value: '${person['total_xp'] ?? '—'}', icon: Icons.bolt_rounded, color: orange),
        DetailMetric(label: 'Day streak', value: '${person['streak_days'] ?? '—'}', icon: Icons.local_fire_department_outlined, color: purple),
        DetailMetric(label: 'AI sessions', value: '${aiStats['total_sessions'] ?? '—'}', icon: Icons.auto_awesome_outlined, color: sky),
      ]),
      const SizedBox(height: 20),
      if (tabs.length > 1) SingleChildScrollView(scrollDirection: Axis.horizontal, child: SegmentedButton<String>(
        segments: tabs.map((value) => ButtonSegment(value: value, label: Text(value))).toList(),
        selected: {selected}, onSelectionChanged: (values) => setState(() => tab = values.first))),
      if (selected == 'Overview') ...[
        const SectionTitle('Contact & identity'),
        DetailField('Email address', displayValue(person['email']), icon: Icons.mail_outline, copy: true),
        DetailField('Phone number', displayValue(person['phone']), icon: Icons.phone_outlined, copy: true),
        const Divider(), const SectionTitle('Learning profile'),
        DetailField('Grade / class', displayValue(person['grade_level'] ?? person['gradeLevel'] ?? person['class_name']), icon: Icons.school_outlined),
        DetailField('Curriculum', displayValue(person['curriculum']), icon: Icons.auto_stories_outlined),
        if (person['subject'] != null) DetailField('Subject', '${person['subject']}', icon: Icons.menu_book_outlined),
        DetailField('Country / language', [person['country'], person['language']].whereType<String>().join(' / '), icon: Icons.public),
        const Divider(), const SectionTitle('Account timeline'),
        DetailField('Joined ElimuAI', readableDate(context, person['created_at']), icon: Icons.event_available_outlined),
        DetailField('Last sign-in', readableDate(context, person['last_login']), icon: Icons.login),
        if (person['plan_expires'] != null) DetailField('Plan expires', readableDate(context, person['plan_expires']), icon: Icons.schedule),
        if (person['trial_expires'] != null) DetailField('Trial expires', readableDate(context, person['trial_expires']), icon: Icons.timelapse_outlined),
        if (_records(detail['classes']).isNotEmpty) ...[
          const SectionTitle('Enrolled classes'),
          for (final item in _records(detail['classes'])) ListTile(contentPadding: EdgeInsets.zero,
            leading: const SubjectIcon('Mathematics'), title: Text('${item['name'] ?? 'Class'}'),
            subtitle: Text([item['subject'], item['teacher_name']].whereType<String>().join(' / '))),
        ],
        if (widget.actions.isNotEmpty) ...[
          const Divider(), const SectionTitle('Account management'),
          Wrap(spacing: 10, runSpacing: 10, children: widget.actions),
        ],
      ],
      if (selected == 'Activity') ActivityTimeline(records: activity),
      if (selected == 'Billing') ...[
        const SectionTitle('Recent payments'),
        if (payments.isEmpty) const EmptyState(icon: Icons.payments_outlined, title: 'No payments', subtitle: 'Payment records will appear here.'),
        for (final payment in payments) FinancialRow(record: payment),
        const SectionTitle('Invoices'),
        if (invoices.isEmpty) const EmptyState(icon: Icons.receipt_long_outlined, title: 'No invoices', subtitle: 'Invoices will appear here.'),
        for (final invoice in invoices) FinancialRow(record: invoice, invoice: true),
      ],
      if (selected == 'AI sessions') ...[
        const SectionTitle('Tutor activity'),
        MetricStrip(metrics: [
          DetailMetric(label: 'Messages', value: '${aiStats['total_messages'] ?? '—'}', icon: Icons.chat_bubble_outline, color: sky),
          DetailMetric(label: 'AI learning XP', value: '${aiStats['total_ai_xp'] ?? '—'}', icon: Icons.bolt_outlined, color: orange),
        ]),
        const SizedBox(height: 16),
        if (sessions.isEmpty) const EmptyState(icon: Icons.auto_awesome_outlined, title: 'No AI sessions yet', subtitle: 'Tutor usage will appear after the first session.'),
        for (final session in sessions) ListTile(contentPadding: const EdgeInsets.symmetric(vertical: 8),
          leading: const Icon(Icons.auto_awesome, color: purple),
          title: Text('${session['type'] ?? 'Tutor'}', style: const TextStyle(fontWeight: FontWeight.w800)),
          subtitle: Text('${session['message_count'] ?? 0} messages / ${readableDate(context, session['created_at'])}'),
          trailing: Text('+${session['xp_earned'] ?? 0} XP', style: const TextStyle(color: emerald, fontWeight: FontWeight.w800))),
      ],
    ]);
  }
}

List<Map<String, dynamic>> _records(dynamic value) => value is List
  ? value.whereType<Map>().map((record) => Map<String, dynamic>.from(record)).toList() : [];

class ActivityTimeline extends StatelessWidget {
  const ActivityTimeline({super.key, required this.records});
  final List<Map<String, dynamic>> records;
  @override
  Widget build(BuildContext context) => records.isEmpty
    ? const EmptyState(icon: Icons.timeline, title: 'A new chapter awaits', subtitle: 'Learning activity will appear here.')
    : Column(children: records.map((record) => Padding(padding: const EdgeInsets.symmetric(vertical: 14), child: Row(
      crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: emerald.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(8)), child: Icon('${record['activity_type']}'.contains('exam') ? Icons.quiz_outlined : Icons.auto_stories_outlined,
          color: emerald, size: 22)), const SizedBox(width: 14),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('${record['activity_type'] ?? 'Learning session'}'.replaceAll('_', ' '), style: const TextStyle(fontWeight: FontWeight.w800)),
        const SizedBox(height: 5), Text(readableDate(context, record['logged_date'] ?? record['created_at']), style: const TextStyle(fontSize: 11)),
        if (record['score'] != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text('Score: ${record['score']}%', style: const TextStyle(fontSize: 12))),
        if (record['duration_mins'] != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text('${record['duration_mins']} min', style: const TextStyle(fontSize: 11))),
      ])), const SizedBox(width: 8), Text('+${record['xp_earned'] ?? 0} XP', style: const TextStyle(color: emerald, fontWeight: FontWeight.w900, fontSize: 12)),
    ]))).toList());
}

class FinancialRow extends StatelessWidget {
  const FinancialRow({super.key, required this.record, this.invoice = false});
  final Map<String, dynamic> record;
  final bool invoice;
  @override
  Widget build(BuildContext context) {
    final status = '${record['status'] ?? 'Unknown'}';
    final success = const {'completed', 'paid', 'success'}.contains(status.toLowerCase());
    final amount = num.tryParse('${record['amount']}');
    return Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [Icon(invoice ? Icons.receipt_long_outlined : Icons.account_balance_wallet_outlined, color: sky, size: 22),
        const SizedBox(width: 10), Expanded(child: Text(invoice ? '${record['invoice_number'] ?? 'Invoice'}' : '${record['plan'] ?? 'Payment'}',
          style: const TextStyle(fontWeight: FontWeight.w800))), const SizedBox(width: 8),
        Text('${record['currency'] ?? 'KES'} ${amount?.toStringAsFixed(2) ?? '—'}', style: const TextStyle(fontWeight: FontWeight.w900)),
      ]), const SizedBox(height: 10), Wrap(spacing: 10, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
        DetailBadge(status, color: success ? emerald : orange, icon: success ? Icons.check_circle_outline : Icons.schedule),
        Text(readableDate(context, record['created_at']), style: const TextStyle(fontSize: 11)),
        if (record['mpesa_receipt'] != null) Text('${record['mpesa_receipt']}', style: const TextStyle(fontSize: 11)),
      ]), const Divider(height: 24),
    ]));
  }
}

class SummaryDetails extends StatelessWidget {
  const SummaryDetails({super.key, required this.id, required this.data});
  final String id;
  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    if (id == 'subscription') {
      final enabled = data['aiEnabled'] == true;
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Container(color: enabled ? const Color(0xFF176B59) : const Color(0xFF9B4331), padding: const EdgeInsets.all(22),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Icon(Icons.card_membership_outlined, color: sunshine, size: 36), const SizedBox(height: 16),
            Text('${data['plan'] ?? 'Learning plan'}'.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)),
            const SizedBox(height: 10), Text(enabled ? 'Your learning access is active' : 'Your learning access is inactive',
              style: const TextStyle(color: Colors.white, height: 1.5)),
          ])), const SizedBox(height: 18),
        Wrap(spacing: 8, runSpacing: 8, children: [
          DetailBadge('${data['source'] ?? 'Account'}'.toUpperCase(), icon: Icons.verified_user_outlined),
          if (data['schoolPlanActive'] == true) const DetailBadge('School plan active', color: sky, icon: Icons.domain_outlined),
          if (data['trialActive'] == true) const DetailBadge('Trial active', color: orange, icon: Icons.timelapse_outlined),
        ]),
        const SectionTitle('Plan details'),
        if (data['daysRemaining'] != null) DetailField('Days remaining', '${data['daysRemaining']}', icon: Icons.hourglass_bottom_outlined),
        DetailField('Access expires', readableDate(context, data['expiresAt']), icon: Icons.event_outlined),
        if (data['schoolPlan'] != null) DetailField('School subscription', '${data['schoolPlan']}', icon: Icons.school_outlined),
        DetailField('AI tutor & Photo Scan', enabled ? 'Available' : 'Subscription required', icon: Icons.auto_awesome_outlined),
      ]);
    }
    if (id == 'progress') {
      final subjects = _records(data['subjects']);
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        MetricStrip(metrics: [
          DetailMetric(label: 'Total XP', value: '${data['total_xp'] ?? '—'}', icon: Icons.bolt, color: orange),
          DetailMetric(label: 'Day streak', value: '${data['streak'] ?? '—'}', icon: Icons.local_fire_department_outlined, color: purple),
          DetailMetric(label: 'XP this week', value: '${data['week_xp'] ?? '—'}', icon: Icons.trending_up, color: emerald),
          DetailMetric(label: 'Minutes this week', value: '${data['week_mins'] ?? '—'}', icon: Icons.timer_outlined, color: sky),
        ]), const SectionTitle('Subject strengths'),
        if (subjects.isEmpty) const EmptyState(icon: Icons.insights_outlined, title: 'Your story is just starting', subtitle: 'Subject scores will appear after practice.'),
        for (final subject in subjects) Padding(padding: const EdgeInsets.only(bottom: 20), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [Expanded(child: Text('${subject['name'] ?? 'Subject'}', style: const TextStyle(fontWeight: FontWeight.w800))),
            Text('${subject['avg_score'] ?? '—'}%', style: const TextStyle(color: emerald, fontWeight: FontWeight.w900))]),
          const SizedBox(height: 10), LinearProgressIndicator(minHeight: 8,
            value: ((num.tryParse('${subject['avg_score']}') ?? 0) / 100).clamp(0, 1).toDouble(),
            color: subjectVisual('${subject['name']}').$2, backgroundColor: emerald.withValues(alpha: .10)),
          const SizedBox(height: 6), Text('${subject['attempts'] ?? 0} attempts', style: const TextStyle(fontSize: 11)),
        ])),
        const SectionTitle('Recent learning'), ActivityTimeline(records: _records(data['recent_activity'])),
      ]);
    }
    final sections = id == 'platform' ? <String, dynamic>{'Users': data['users'], 'Payments': data['payments'], 'SMS delivery': data['sms']}
      : <String, dynamic>{'School snapshot': data};
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      if (data['name'] != null) Text('${data['name']}', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
      for (final section in sections.entries) if (section.value is Map) ...[
        SectionTitle(section.key),
        MetricStrip(metrics: (section.value as Map).entries.where((entry) => entry.value is num).map((entry) => DetailMetric(
          label: '${entry.key}'.replaceAll('_', ' '), value: '${entry.value}',
          icon: '${entry.key}'.contains('score') ? Icons.insights_outlined : '${entry.key}'.contains('teacher') ? Icons.co_present_outlined : Icons.bar_chart,
          color: '${entry.key}'.contains('teacher') ? purple : '${entry.key}'.contains('student') ? sky : emerald,
        )).toList()),
        for (final entry in (section.value as Map).entries.where((entry) =>
            entry.value is String && !const {'id', 'school_id', 'name'}.contains('${entry.key}')))
          DetailField('${entry.key}'.replaceAll('_', ' '), '${entry.value}'),
      ],
    ]);
  }
}

class PersonListItem extends StatelessWidget {
  const PersonListItem({super.key, required this.person, required this.onTap, required this.color});
  final Map<String, dynamic> person;
  final VoidCallback onTap;
  final Color color;
  @override
  Widget build(BuildContext context) => InkWell(borderRadius: BorderRadius.circular(8), onTap: onTap,
    child: Padding(padding: const EdgeInsets.all(14), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      CircleAvatar(radius: 22, backgroundColor: color.withValues(alpha: .17),
        child: Text('${person['name'] ?? '?'}'.split(' ').where((part) => part.isNotEmpty).take(2)
          .map((part) => part[0]).join().toUpperCase(), style: TextStyle(color: color, fontWeight: FontWeight.w900))),
      const SizedBox(width: 12), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(displayValue(person['name']), style: const TextStyle(fontWeight: FontWeight.w900, height: 1.4)),
        const SizedBox(height: 5), Text(displayValue(person['email'] ?? person['phone']),
          style: const TextStyle(fontSize: 11, height: 1.5), maxLines: 2, overflow: TextOverflow.ellipsis),
        const SizedBox(height: 9), Wrap(spacing: 6, runSpacing: 6, children: [
          if (person['role'] != null) DetailBadge('${person['role']}'.replaceAll('_', ' '), color: color),
          if (person['grade_level'] != null) DetailBadge('${person['grade_level']}', color: sky),
          if (person['is_active'] != null) DetailBadge(recordFlag(person['is_active']) ? 'Active' : 'Disabled',
            color: recordFlag(person['is_active']) ? emerald : orange),
          if (recordFlag(person['email_verified'])) const DetailBadge('Verified', icon: Icons.verified_outlined),
        ]),
      ])), const SizedBox(width: 4), const Icon(Icons.chevron_right, size: 20),
    ])));
}