import 'package:flutter/material.dart';

import 'study.dart';
import 'ui.dart';

const allRoles = {'student', 'parent', 'teacher', 'admin', 'super_admin'};
const staffRoles = {'teacher', 'admin', 'super_admin'};
const adminRoles = {'admin', 'super_admin'};
const platformRoles = {'super_admin'};

class FormFieldSpec {
  const FormFieldSpec(this.key, this.label, {this.required = false, this.lines = 1,
    this.secret = false, this.options, this.lookup, this.lookupKey,
    this.numeric = false, this.minLength = 0});
  final String key;
  final String label;
  final bool required;
  final bool secret;
  final bool numeric;
  final int lines;
  final int minLength;
  final List<String>? options;
  final String? lookup;
  final String? lookupKey;
}

class RecordAction {
  const RecordAction(this.label, this.suffix, {this.method = 'POST', this.confirm = false,
    this.roles = allRoles, this.icon = Icons.send_outlined});
  final String label;
  final String suffix;
  final String method;
  final bool confirm;
  final Set<String> roles;
  final IconData icon;
}

class AppFeature {
  const AppFeature({required this.id, required this.title, required this.description,
    required this.icon, required this.color, required this.path, this.key,
    this.roles = allRoles, this.fields = const [], this.createPath, this.createMethod = 'POST',
    this.envelope, this.edit = false, this.remove = false, this.actions = const [],
    this.detailPath, this.paginated = false});
  final String id;
  final String title;
  final String description;
  final IconData icon;
  final Color color;
  final String path;
  final String? key;
  final Set<String> roles;
  final List<FormFieldSpec> fields;
  final String? createPath;
  final String createMethod;
  final String? envelope;
  final bool edit;
  final bool remove;
  final bool paginated;
  final List<RecordAction> actions;
  final String? detailPath;

  bool visibleTo(Study study) => roles.contains(study.role) &&
    (!path.contains('{school}') || study.user?['school_id'] != null);
  String endpoint(Study study) => path.replaceAll('{school}', '${study.user?['school_id']}')
    .replaceAll('{role}', study.role);

  Map<String, dynamic> payload(Map<String, dynamic> values) {
    if (envelope == 'students') {
      final student = {...values}..remove('class_id');
      return {'students': [student], if (values['class_id'] != null) 'class_id': values['class_id']};
    }
    return envelope == null ? values : {envelope!: [values]};
  }
}

const nameField = FormFieldSpec('name', 'Full name', required: true);
const emailField = FormFieldSpec('email', 'Email address', required: true);
const gradeField = FormFieldSpec('grade_level', 'Grade level');
const subjectField = FormFieldSpec('subject', 'Subject');

const features = <AppFeature>[
  AppFeature(id: 'photoscan', title: 'Photo Scan', description: 'Bring your question into focus',
    icon: Icons.document_scanner_outlined, color: orange, path: '/api/ai/photoscan/analyse'),
  AppFeature(id: 'homework', title: 'Homework lab', description: 'Work it out, step by step',
    icon: Icons.lightbulb_outline, color: orange, path: '/api/ai/homework'),
  AppFeature(id: 'exams', title: 'Exam practice', description: 'Build confidence with practice',
    icon: Icons.quiz_outlined, color: sky, path: '/api/exams/papers', key: 'papers'),
  AppFeature(id: 'progress', title: 'My progress', description: 'Your effort, made visible',
    icon: Icons.insights_rounded, color: emerald, path: '/api/progress/summary'),
  AppFeature(id: 'achievements', title: 'Achievements', description: 'Every milestone matters',
    icon: Icons.emoji_events_outlined, color: orange, path: '/api/progress/achievements', key: 'achievements'),
  AppFeature(id: 'leaderboard', title: 'Leaderboard', description: 'Grow with your community',
    icon: Icons.leaderboard_outlined, color: purple, path: '/api/leaderboard', key: 'leaderboard'),
  AppFeature(id: 'exam-history', title: 'Exam results', description: 'Review your past attempts',
    icon: Icons.fact_check_outlined, color: sky, path: '/api/exams/history', key: 'attempts'),
  AppFeature(id: 'children', title: 'My children', description: 'Stay close to their learning',
    icon: Icons.family_restroom, color: orange, path: '/api/users/children', key: 'children', roles: {'parent'},
    createPath: '/api/users/onboard-child', fields: [nameField, emailField,
      FormFieldSpec('phone', 'Phone number'), gradeField]),
  AppFeature(id: 'classes', title: 'Classes', description: 'Your teaching, organised',
    icon: Icons.school_outlined, color: sky, path: '/api/onboarding/classes', key: 'classes', roles: staffRoles,
    createPath: '/api/onboarding/classes', fields: [
      FormFieldSpec('name', 'Class name', required: true), gradeField, subjectField]),
  AppFeature(id: 'students', title: 'Students', description: 'Support every learner',
    icon: Icons.groups_outlined, color: emerald, path: '/api/onboarding/students', key: 'students', roles: staffRoles,
    detailPath: '/api/onboarding/students/{id}', createPath: '/api/onboarding/students', envelope: 'students',
    fields: [nameField, emailField, gradeField,
      FormFieldSpec('class_id', 'Class', lookup: '/api/onboarding/classes', lookupKey: 'classes')], actions: [
      RecordAction('Resend invitation', '/resend-invite', confirm: true),
      RecordAction('Reset password', '/reset-password', confirm: true, icon: Icons.lock_reset),
      RecordAction('Verify account', '/verify', confirm: true, icon: Icons.verified_outlined),
      RecordAction('Toggle active status', '/toggle-active', method: 'PATCH', confirm: true, icon: Icons.person_off_outlined),
    ]),
  AppFeature(id: 'teachers', title: 'Teachers', description: 'Bring your teaching team together',
    icon: Icons.co_present_outlined, color: purple, path: '/api/onboarding/teachers', key: 'teachers', roles: adminRoles,
    createPath: '/api/onboarding/teachers', envelope: 'teachers', fields: [nameField, emailField,
      FormFieldSpec('phone', 'Phone number'), subjectField, FormFieldSpec('class_name', 'Class name'), gradeField],
    actions: [RecordAction('Resend invitation', '/resend-invite', confirm: true),
      RecordAction('Toggle active status', '/toggle-active', method: 'PATCH', confirm: true, icon: Icons.person_off_outlined)]),
  AppFeature(id: 'lessons', title: 'Lesson studio', description: 'Create something worth learning',
    icon: Icons.edit_note_rounded, color: orange, path: '/api/curriculum/offline-lessons/manage', key: 'lessons', roles: staffRoles,
    createPath: '/api/curriculum/offline-lessons', edit: true, remove: true, fields: [
      FormFieldSpec('title', 'Lesson title', required: true),
      FormFieldSpec('content', 'Lesson content', required: true, lines: 7),
      FormFieldSpec('title_sw', 'Kiswahili title'), FormFieldSpec('content_sw', 'Kiswahili content', lines: 5),
      FormFieldSpec('subject_id', 'Subject', lookup: '/api/curriculum/subjects', lookupKey: 'subjects'),
      gradeField, FormFieldSpec('curriculum', 'Curriculum'),
    ]),
  AppFeature(id: 'school', title: 'School overview', description: 'A clear picture of your school',
    icon: Icons.domain_outlined, color: emerald, path: '/api/schools/{school}/stats', key: 'school', roles: adminRoles),
  AppFeature(id: 'rankings', title: 'School rankings', description: 'Celebrate school-wide effort',
    icon: Icons.workspace_premium_outlined, color: orange, path: '/api/leaderboard/school-rankings', roles: staffRoles),
  AppFeature(id: 'insights', title: 'School insights', description: 'Turn learning data into next steps',
    icon: Icons.auto_awesome_outlined, color: purple, path: '/api/ai/school-insights', roles: adminRoles),
  AppFeature(id: 'subscription', title: 'My plan', description: 'Your learning subscription',
    icon: Icons.card_membership_outlined, color: emerald, path: '/api/payments/subscription-status'),
  AppFeature(id: 'invoices', title: 'Invoices', description: 'Receipts in one place',
    icon: Icons.receipt_long_outlined, color: sky, path: '/api/payments/invoices', key: 'invoices',
    actions: [RecordAction('Email invoice', '/email', confirm: true)]),
  AppFeature(id: 'payments', title: 'Payment history', description: 'Your payment records',
    icon: Icons.account_balance_wallet_outlined, color: orange, path: '/api/payments/history', key: 'payments'),
  AppFeature(id: 'profile', title: 'My profile', description: 'Make ElimuAI yours',
    icon: Icons.person_outline, color: purple, path: '/api/users/profile', key: 'user',
    createPath: '/api/users/profile', createMethod: 'PATCH', fields: [nameField,
      FormFieldSpec('phone', 'Phone number'), FormFieldSpec('language', 'Language', options: ['en', 'sw'])]),
  AppFeature(id: 'grade', title: 'My grade', description: 'Keep your curriculum up to date',
    icon: Icons.school_outlined, color: sky, path: '/api/users/profile', key: 'user',
    createPath: '/api/users/grade', fields: [FormFieldSpec('grade_level', 'Grade level', required: true)]),
  AppFeature(id: 'password', title: 'Change password', description: 'Keep your account secure',
    icon: Icons.lock_outline, color: emerald, path: '/api/auth/change-password', createPath: '/api/auth/change-password',
    fields: [FormFieldSpec('current_password', 'Current password', required: true, secret: true),
      FormFieldSpec('new_password', 'New password', required: true, secret: true, minLength: 8)]),
  AppFeature(id: 'sessions', title: 'Signed-in devices', description: 'You are in control',
    icon: Icons.devices_outlined, color: sky, path: '/api/auth/sessions', key: 'sessions',
    actions: [RecordAction('Sign out this device', '', method: 'DELETE', confirm: true, icon: Icons.logout)]),
  AppFeature(id: 'delete-account', title: 'Delete account', description: 'Permanently close your account',
    icon: Icons.person_remove_outlined, color: Color(0xFFBD354F), path: '/api/auth/account',
    roles: {'student', 'parent', 'teacher', 'admin'}),
  AppFeature(id: 'platform', title: 'Platform overview', description: 'ElimuAI at a glance',
    icon: Icons.dashboard_outlined, color: emerald, path: '/api/admin/dashboard', roles: platformRoles),
  AppFeature(id: 'users', title: 'User directory', description: 'Manage platform accounts',
    icon: Icons.manage_accounts_outlined, color: purple, path: '/api/admin/users', key: 'users', roles: platformRoles,
    paginated: true, detailPath: '/api/admin/users/{id}', createPath: '/api/admin/users',
    fields: [nameField, emailField, FormFieldSpec('password', 'Initial password', required: true, secret: true, minLength: 8),
      FormFieldSpec('role', 'Role', required: true, options: ['student', 'parent', 'teacher', 'admin']),
      FormFieldSpec('country', 'Country', required: true, options: ['KE', 'TZ', 'UG', 'RW']), gradeField],
    actions: [RecordAction('Toggle active status', '/toggle-active', method: 'PUT', confirm: true, icon: Icons.person_off_outlined),
      RecordAction('Verify email', '/send-verification', confirm: true, icon: Icons.verified_outlined),
      RecordAction('Reset password', '/reset-password', confirm: true, icon: Icons.lock_reset)]),
  AppFeature(id: 'transactions', title: 'Transactions', description: 'Track platform payments',
    icon: Icons.payments_outlined, color: emerald, path: '/api/admin/transactions', key: 'transactions', roles: platformRoles, paginated: true),
  AppFeature(id: 'sms', title: 'SMS delivery', description: 'Notification delivery records',
    icon: Icons.sms_outlined, color: sky, path: '/api/admin/sms-logs', key: 'sms_logs', roles: platformRoles, paginated: true),
];

List<AppFeature> featuresFor(Study study) => features.where((feature) => feature.visibleTo(study)).toList();

String friendlyLabel(String key) => key.replaceAllMapped(RegExp(r'([a-z])([A-Z])'),
    (match) => '${match[1]} ${match[2]}').replaceAll('_', ' ').split(' ')
    .where((word) => word.isNotEmpty).map((word) => '${word[0].toUpperCase()}${word.substring(1)}').join(' ');