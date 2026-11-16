import 'package:flutter/material.dart';

import 'study.dart';
import 'ui.dart';

class _Role {
  const _Role(this.id, this.icon, this.gradient, this.title, this.blurb);
  final String id;
  final IconData icon;
  final LinearGradient gradient;
  final String title;
  final String blurb;
}

const _roles = <_Role>[
  _Role('student', Icons.school_rounded, brandGradient, 'Student', 'Learn with your AI tutor'),
  _Role('parent', Icons.favorite_rounded, sunriseGradient, 'Parent', "Follow your child's progress"),
  _Role('teacher', Icons.co_present_rounded, LinearGradient(colors: [sky, indigo],
    begin: Alignment.topLeft, end: Alignment.bottomRight), 'Teacher', 'Manage classes & lessons'),
  _Role('admin', Icons.domain_rounded, heroGradient, 'School', 'Run your school on ElimuAI'),
];

const _grades = <String>[
  'PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7 (JSS)', 'Grade 8 (JSS)', 'Grade 9 (JSS)',
];

/// Short, gamified, multi-step sign-up. Returns the /api/auth/register response.
class SignUp extends StatefulWidget {
  const SignUp({super.key, required this.study});
  final Study study;
  @override
  State<SignUp> createState() => _SignUpState();
}

class _SignUpState extends State<SignUp> {
  int step = 0;
  String role = '';
  final name = TextEditingController();
  final email = TextEditingController();
  final password = TextEditingController();
  final school = TextEditingController();
  final token = TextEditingController();
  final form = GlobalKey<FormState>();
  String country = 'KE';
  String? gradeLevel;
  bool hidden = true;
  bool busy = false;
  String? error;

  _Role get picked => _roles.firstWhere((r) => r.id == role, orElse: () => _roles.first);

  void choose(String id) => setState(() { role = id; error = null; step = 1; });

  @override
  void dispose() {
    name.dispose(); email.dispose(); password.dispose();
    school.dispose(); token.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (busy || !form.currentState!.validate()) return;
    setState(() { busy = true; error = null; });
    try {
      final body = <String, dynamic>{
        'name': name.text.trim(), 'email': email.text.trim(), 'password': password.text,
        'role': role, 'country': country, 'language': 'en', 'curriculum': 'CBC',
      };
      if (role == 'student' && gradeLevel != null) body['grade_level'] = gradeLevel;
      if (role == 'admin') {
        body['school_name'] = school.text.trim();
        if (token.text.trim().isNotEmpty) body['signup_token'] = token.text.trim();
      }
      final response = await widget.study.api.post('/api/auth/register', body);
      if (mounted) Navigator.pop(context, response);
    } catch (failure) {
      if (mounted) setState(() => error = '$failure');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final onVariant = Theme.of(context).colorScheme.onSurfaceVariant;
    return Scaffold(
      appBar: AppBar(leading: BackButton(onPressed: () =>
        step == 0 ? Navigator.pop(context) : setState(() { step = 0; error = null; }))),
      body: SafeArea(child: Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 480),
        child: ListView(padding: const EdgeInsets.fromLTRB(24, 4, 24, 24), children: [
          // Progress
          Row(children: [
            Expanded(child: ClipRRect(borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(value: (step + 1) / 2, minHeight: 7,
                backgroundColor: purple.withValues(alpha: .12), color: purple))),
            const SizedBox(width: 12),
            Text('Step ${step + 1} of 2', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: onVariant)),
          ]),
          const SizedBox(height: 22),

          if (step == 0) ...[
            const Brand(), const SizedBox(height: 20),
            const Text("Let's get you started \u2728",
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, height: 1.2)),
            const SizedBox(height: 8),
            Text('Who is signing up? Pick one to continue.', style: TextStyle(height: 1.5, color: onVariant)),
            const SizedBox(height: 22),
            ..._roles.map((r) => Padding(padding: const EdgeInsets.only(bottom: 12), child: _RoleButton(role: r, onTap: () => choose(r.id)))),
            const SizedBox(height: 10),
            Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(
              color: sunshine.withValues(alpha: .18), borderRadius: BorderRadius.circular(16)),
              child: Row(children: [
                const Text('\u{1F389}', style: TextStyle(fontSize: 22)), const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Learning is a game here', style: TextStyle(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text('Earn XP, keep daily streaks, and climb the leaderboard.',
                    style: TextStyle(fontSize: 12, height: 1.4, color: onVariant)),
                ])),
              ])),
          ] else ...[
            Row(children: [
              Container(width: 46, height: 46, decoration: BoxDecoration(gradient: picked.gradient,
                borderRadius: BorderRadius.circular(14)), child: Icon(picked.icon, color: Colors.white, size: 24)),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Almost there!', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
                Text('Signing up as a ${picked.title.toLowerCase()}', style: TextStyle(fontSize: 12, color: onVariant)),
              ])),
            ]),
            const SizedBox(height: 22),
            Form(key: form, child: Column(children: [
              TextFormField(controller: name, textInputAction: TextInputAction.next, textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Full name', prefixIcon: Icon(Icons.person_outline)),
                validator: (v) => (v == null || v.trim().length < 2) ? 'Enter your name.' : null),
              const SizedBox(height: 14),
              TextFormField(controller: email, keyboardType: TextInputType.emailAddress, textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline)),
                validator: (v) => (v == null || !RegExp(r'^\S+@\S+\.\S+$').hasMatch(v.trim())) ? 'Enter a valid email.' : null),
              const SizedBox(height: 14),
              TextFormField(controller: password, obscureText: hidden, textInputAction: TextInputAction.next,
                decoration: InputDecoration(labelText: 'Password', prefixIcon: const Icon(Icons.lock_outline),
                  suffixIcon: IconButton(onPressed: () => setState(() => hidden = !hidden),
                    icon: Icon(hidden ? Icons.visibility_outlined : Icons.visibility_off_outlined))),
                validator: (v) => (v == null || v.length < 8) ? 'Use at least 8 characters.' : null),
              if (role == 'student') ...[
                const SizedBox(height: 14),
                DropdownButtonFormField<String>(initialValue: gradeLevel, isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Grade / class', prefixIcon: Icon(Icons.school_outlined)),
                  items: _grades.map((g) => DropdownMenuItem(value: g, child: Text(g))).toList(),
                  onChanged: (v) => setState(() => gradeLevel = v),
                  validator: (v) => (role == 'student' && (v == null || v.isEmpty)) ? 'Select your grade.' : null),
              ],
              if (role == 'admin') ...[
                const SizedBox(height: 14),
                TextFormField(controller: school, textCapitalization: TextCapitalization.words, textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(labelText: 'School name', prefixIcon: Icon(Icons.domain_outlined)),
                  validator: (v) => (role == 'admin' && (v == null || v.trim().length < 2)) ? 'Enter your school name.' : null),
                const SizedBox(height: 14),
                TextFormField(controller: token, obscureText: true,
                  decoration: const InputDecoration(labelText: 'School signup code (if supplied)', prefixIcon: Icon(Icons.vpn_key_outlined))),
              ],
              const SizedBox(height: 16),
              Text('Country', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: onVariant)),
              const SizedBox(height: 8),
              Wrap(spacing: 8, children: [
                for (final c in const [('KE', 'Kenya'), ('TZ', 'Tanzania'), ('UG', 'Uganda')])
                  ChoiceChip(label: Text(c.$2), selected: country == c.$1, showCheckmark: false,
                    onSelected: (_) => setState(() => country = c.$1)),
              ]),
            ])),
            const SizedBox(height: 18),
            if (error != null) Notice(error!, icon: Icons.error_outline),
            Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(
              color: emerald.withValues(alpha: .12), borderRadius: BorderRadius.circular(14)),
              child: Row(children: const [
                Icon(Icons.emoji_events_outlined, color: emerald), SizedBox(width: 10),
                Expanded(child: Text('Finish to unlock your first badge and start a streak.',
                  style: TextStyle(fontSize: 12, height: 1.4, fontWeight: FontWeight.w600))),
              ])),
            const SizedBox(height: 18),
            SizedBox(width: double.infinity, child: FilledButton(onPressed: busy ? null : submit,
              child: busy ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                : Row(mainAxisAlignment: MainAxisAlignment.center, children: const [
                  Text('Create my account'), SizedBox(width: 8), Icon(Icons.arrow_forward_rounded, size: 19)]))),
          ],
        ])),
      )),
    );
  }
}

class _RoleButton extends StatelessWidget {
  const _RoleButton({required this.role, required this.onTap});
  final _Role role;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(color: Theme.of(context).colorScheme.surface,
    borderRadius: BorderRadius.circular(20), child: InkWell(borderRadius: BorderRadius.circular(20), onTap: onTap,
      child: Container(padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Theme.of(context).colorScheme.outlineVariant.withValues(alpha: .5))),
        child: Row(children: [
          Container(width: 58, height: 58, decoration: BoxDecoration(gradient: role.gradient,
            borderRadius: BorderRadius.circular(18), boxShadow: [BoxShadow(color: role.gradient.colors.last.withValues(alpha: .35),
              blurRadius: 16, offset: const Offset(0, 8))]), child: Icon(role.icon, color: Colors.white, size: 30)),
          const SizedBox(width: 16),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(role.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
            const SizedBox(height: 3),
            Text(role.blurb, style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant)),
          ])),
          const Icon(Icons.arrow_forward_ios_rounded, size: 16),
        ]))));
}
