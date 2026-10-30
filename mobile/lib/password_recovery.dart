import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'api.dart';
import 'ui.dart';

class PasswordRecovery extends StatefulWidget {
  const PasswordRecovery({super.key, required this.api, this.initialEmail = ''});
  final ElimuApi api;
  final String initialEmail;
  @override
  State<PasswordRecovery> createState() => _PasswordRecoveryState();
}

class _PasswordRecoveryState extends State<PasswordRecovery> {
  final form = GlobalKey<FormState>();
  late final email = TextEditingController(text: widget.initialEmail);
  final code = TextEditingController();
  final password = TextEditingController();
  final confirmation = TextEditingController();
  bool sent = false;
  bool complete = false;
  bool busy = false;
  bool hidden = true;
  String? error;
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

  String message(Object failure) {
    if (failure is ApiException && const {404, 405, 501}.contains(failure.status)) {
      return 'Password recovery is not available on the server yet. Please try again later.';
    }
    return '$failure';
  }

  Future<void> requestCode({bool resend = false}) async {
    if (busy || (resend && cooldown > 0) || (!resend && !form.currentState!.validate())) return;
    setState(() { busy = true; error = null; });
    try {
      await widget.api.post('/api/auth/forgot-password', {'email': email.text.trim()});
      if (mounted) setState(() { sent = true; code.clear(); startCooldown(); });
    } catch (failure) {
      if (mounted) setState(() => error = message(failure));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> reset() async {
    if (busy || !form.currentState!.validate()) return;
    setState(() { busy = true; error = null; });
    try {
      final result = await widget.api.post('/api/auth/reset-password', {
        'email': email.text.trim(), 'code': code.text.trim(), 'new_password': password.text,
      });
      if (result['success'] != true) throw const ApiException('Password reset was not completed. Please try again.');
      await widget.api.clearSession();
      if (mounted) {
        setState(() {
          complete = true; timer?.cancel(); code.clear(); password.clear(); confirmation.clear();
        });
      }
    } catch (failure) {
      if (mounted) setState(() => error = message(failure));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  void dispose() {
    timer?.cancel(); email.dispose(); code.dispose(); password.dispose(); confirmation.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Password recovery', style: TextStyle(fontSize: 18))),
    body: SafeArea(child: Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 480),
      child: Form(key: form, child: ListView(padding: const EdgeInsets.all(24), children: [
        const Brand(), const SizedBox(height: 32),
        Icon(complete ? Icons.check_circle_outline : Icons.lock_reset_rounded, color: emerald, size: 52),
        const SizedBox(height: 22), Text(complete ? 'Password updated' : sent ? 'Set a new password' : 'Reset your password',
          style: const TextStyle(fontSize: 28, height: 1.3, fontWeight: FontWeight.w900)),
        const SizedBox(height: 12), Text(complete ? 'Sign in with your new password. Your previous sessions have been signed out.'
          : sent ? 'If an eligible account exists for ${email.text.trim()}, a 6-digit reset code has been emailed to it.'
          : 'Enter the email address on your ElimuAI account.', style: const TextStyle(height: 1.6)),
        const SizedBox(height: 24),
        if (!sent && !complete) TextFormField(controller: email, enabled: !busy,
          keyboardType: TextInputType.emailAddress, autofillHints: const [AutofillHints.email],
          decoration: const InputDecoration(labelText: 'Email address', prefixIcon: Icon(Icons.email_outlined)),
          validator: (value) => value == null || !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value.trim())
            ? 'Enter a valid email address.' : null,
          onFieldSubmitted: (_) => requestCode()),
        if (sent && !complete) ...[
          TextFormField(controller: code, enabled: !busy, keyboardType: TextInputType.number,
            autofillHints: const [AutofillHints.oneTimeCode], maxLength: 6,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(labelText: 'Reset code', prefixIcon: Icon(Icons.pin_outlined)),
            validator: (value) => value?.length == 6 ? null : 'Enter the 6-digit reset code.'),
          const SizedBox(height: 14),
          TextFormField(controller: password, enabled: !busy, obscureText: hidden,
            autocorrect: false, enableSuggestions: false, autofillHints: const [AutofillHints.newPassword],
            decoration: InputDecoration(labelText: 'New password', prefixIcon: const Icon(Icons.lock_outline),
              suffixIcon: IconButton(tooltip: hidden ? 'Show password' : 'Hide password',
                onPressed: () => setState(() => hidden = !hidden),
                icon: Icon(hidden ? Icons.visibility_outlined : Icons.visibility_off_outlined))),
            validator: (value) => value == null || value.length < 8 ? 'Use at least 8 characters.' : null),
          const SizedBox(height: 14),
          TextFormField(controller: confirmation, enabled: !busy, obscureText: hidden,
            autocorrect: false, enableSuggestions: false,
            decoration: const InputDecoration(labelText: 'Confirm new password', prefixIcon: Icon(Icons.lock_outline)),
            validator: (value) => value == password.text ? null : 'Passwords do not match.',
            onFieldSubmitted: (_) => reset()),
        ],
        if (error != null) Notice(error!, icon: Icons.error_outline),
        const SizedBox(height: 22),
        FilledButton.icon(onPressed: busy ? null : complete ? () => Navigator.pop(context, true)
          : sent ? reset : () => requestCode(),
          icon: busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
            : Icon(complete ? Icons.login : Icons.arrow_forward),
          label: Text(complete ? 'Back to sign in' : sent ? 'Update password' : 'Send reset code')),
        if (sent && !complete) ...[
          const SizedBox(height: 10), TextButton(onPressed: busy || cooldown > 0 ? null : () => requestCode(resend: true),
            child: Text(cooldown > 0 ? 'Resend code in ${cooldown}s' : 'Resend reset code')),
          TextButton(onPressed: busy ? null : () => setState(() {
            sent = false; error = null; code.clear(); password.clear(); confirmation.clear(); timer?.cancel(); cooldown = 0;
          }), child: const Text('Use another email address')),
        ],
      ])),
    ))),
  );
}