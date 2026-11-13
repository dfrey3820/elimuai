import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'study.dart';
import 'ui.dart';
import 'features.dart';
import 'feature_views.dart';
import 'password_recovery.dart';

class SignIn extends StatefulWidget {
  const SignIn({super.key, required this.study});
  final Study study;
  @override
  State<SignIn> createState() => _SignInState();
}

class _SignInState extends State<SignIn> {
  final identifier = TextEditingController();
  final password = TextEditingController();
  final code = TextEditingController();
  final form = GlobalKey<FormState>();
  bool busy = false;
  bool hidden = true;
  String? error;
  String? email;
  String purpose = 'login';
  int cooldown = 0;
  Timer? timer;

  void startCooldown() {
    cooldown = 60;
    timer?.cancel();
    timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return timer.cancel();
      setState(() => cooldown--);
      if (cooldown == 0) timer.cancel();
    });
  }

  Future<void> submit() async {
    if (busy || !form.currentState!.validate()) return;
    setState(() { busy = true; error = null; });
    try {
      if (email == null) {
        final response = await widget.study.api.login(identifier.text, password.text);
        if (response['requiresOTP'] == true) {
          if (!mounted) return;
          setState(() {
            email = response['email'] as String;
            purpose = '${response['purpose'] ?? 'login'}';
            password.clear();
            startCooldown();
          });
        } else {
          await widget.study.api.saveSession(response);
          await widget.study.enter(response);
        }
      } else {
        final response = await widget.study.api.verify(email!, code.text.trim(), purpose);
        await widget.study.enter(response);
      }
    } catch (failure) {
      if (mounted) setState(() => error = '$failure');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> resend() async {
    if (cooldown > 0 || busy) return;
    setState(() { busy = true; error = null; });
    try {
      await widget.study.api.post('/api/auth/resend-otp', {'email': email, 'purpose': purpose});
      if (mounted) setState(() { code.clear(); startCooldown(); });
    } catch (failure) {
      if (mounted) setState(() => error = '$failure');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> register() async {
    final response = await Navigator.push<Map<String, dynamic>>(context, MaterialPageRoute(builder: (_) => NativeForm(
      study: widget.study, title: 'Join ElimuAI', submitLabel: 'Create account',
      fields: const [nameField, emailField, FormFieldSpec('phone', 'Phone number'),
        FormFieldSpec('password', 'Password', required: true, secret: true, minLength: 8),
        FormFieldSpec('role', 'I am a', required: true, options: ['student', 'parent', 'teacher', 'admin']),
        FormFieldSpec('country', 'Country', required: true, options: ['KE', 'TZ', 'UG']),
        FormFieldSpec('language', 'Language', required: true, options: ['en', 'sw']),
        gradeField, FormFieldSpec('curriculum', 'Curriculum'),
        FormFieldSpec('school_name', 'School name (school administrators)'),
        FormFieldSpec('signup_token', 'School signup code (if supplied)', secret: true),
      ], initial: const {'role': 'student', 'country': 'KE', 'language': 'en', 'curriculum': 'CBC'},
      submit: (values) => widget.study.api.post('/api/auth/register', values),
    )));
    if (!mounted || response == null) return;
    final registered = response['user'];
    if (registered is Map && registered['email'] is String) {
      setState(() { email = registered['email']; purpose = 'signup'; error = null; startCooldown(); });
    } else {
      setState(() => error = 'Account created. Sign in to verify your email.');
    }
  }

  Future<void> recoverPassword() async {
    final changed = await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => PasswordRecovery(
      api: widget.study.api, initialEmail: identifier.text.contains('@') ? identifier.text.trim() : '',
    )));
    if (mounted && changed == true) setState(() { password.clear(); error = null; });
  }

  @override
  void dispose() {
    timer?.cancel();
    identifier.dispose(); password.dispose(); code.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(body: SafeArea(child: Center(
    child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 480),
      child: ListView(padding: const EdgeInsets.fromLTRB(26, 28, 26, 24), children: [
        const Brand(), const SizedBox(height: 24),
        ClipRRect(borderRadius: BorderRadius.circular(8),
          child: Image.asset('assets/images/teacher.jpg', height: 168, width: double.infinity,
            fit: BoxFit.cover, alignment: const Alignment(.45, -.25),
            semanticLabel: 'A learner studying in a library')),
        const SizedBox(height: 26),
        Text(email == null ? 'A little learning.\nA world of possibility.' : 'Check your email',
          style: const TextStyle(fontSize: 29, fontWeight: FontWeight.w900, height: 1.2)),
        const SizedBox(height: 10),
        Text(email == null ? 'Welcome back. Let\'s pick up where you left off.' : 'Enter the 6-digit code sent to $email.',
          style: TextStyle(height: 1.6, color: Theme.of(context).colorScheme.onSurfaceVariant)),
        const SizedBox(height: 24),
        Form(key: form, child: AutofillGroup(child: Column(children: [
          if (email == null) ...[
            TextFormField(controller: identifier, autofillHints: const [AutofillHints.username],
              keyboardType: TextInputType.emailAddress, textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'Email or phone', prefixIcon: Icon(Icons.person_outline)),
              validator: (value) => value == null || value.trim().isEmpty ? 'Enter your email or phone.' : null),
            const SizedBox(height: 14),
            TextFormField(controller: password, obscureText: hidden,
              autofillHints: const [AutofillHints.password], onFieldSubmitted: (_) => submit(),
              decoration: InputDecoration(labelText: 'Password', prefixIcon: const Icon(Icons.lock_outline),
                suffixIcon: IconButton(tooltip: hidden ? 'Show password' : 'Hide password',
                  onPressed: () => setState(() => hidden = !hidden),
                  icon: Icon(hidden ? Icons.visibility_outlined : Icons.visibility_off_outlined))),
              validator: (value) => value == null || value.isEmpty ? 'Enter your password.' : null),
          ] else TextFormField(controller: code, autofocus: true, keyboardType: TextInputType.number,
            autofillHints: const [AutofillHints.oneTimeCode], maxLength: 6,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            onFieldSubmitted: (_) => submit(),
            decoration: const InputDecoration(labelText: 'Verification code', prefixIcon: Icon(Icons.mark_email_read_outlined)),
            validator: (value) => value?.length != 6 ? 'Enter all 6 digits.' : null),
          if (error != null) Notice(error!, icon: Icons.error_outline),
          if (widget.study.startupError != null && error == null) Notice(widget.study.startupError!),
          const SizedBox(height: 20),
          SizedBox(width: double.infinity, child: FilledButton(onPressed: busy ? null : submit,
            child: busy ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
              : Row(mainAxisAlignment: MainAxisAlignment.center, children: [Text(email == null ? 'Sign in' : 'Verify & continue'),
                const SizedBox(width: 10), const Icon(Icons.arrow_forward_rounded, size: 19)]))),
        ]))),
        if (email != null) ...[
          TextButton(onPressed: cooldown > 0 || busy ? null : resend,
            child: Text(cooldown > 0 ? 'Resend code in ${cooldown}s' : 'Resend code')),
          TextButton(onPressed: busy ? null : () => setState(() { email = null; error = null; code.clear(); }),
            child: const Text('Use another account')),
        ] else ...[
          Align(alignment: Alignment.centerRight, child: TextButton(
            onPressed: busy ? null : recoverPassword, child: const Text('Forgot password?'))),
          const SizedBox(height: 6),
          OutlinedButton(onPressed: busy ? null : widget.study.enterDemo,
            style: OutlinedButton.styleFrom(minimumSize: const Size(double.infinity, 50),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
            child: const Text('Explore a demo')),
          const SizedBox(height: 14),
          TextButton(onPressed: busy ? null : register, child: const Text('New to ElimuAI? Create an account')),
        ],
      ])),
  )));
}