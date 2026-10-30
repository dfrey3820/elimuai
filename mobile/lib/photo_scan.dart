import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:image_picker/image_picker.dart';

import 'api.dart';
import 'feature_views.dart';
import 'features.dart';
import 'study.dart';
import 'ui.dart';

String? scanImageMime(Uint8List bytes) {
  if (bytes.length < 12) return null;
  if (bytes[0] == 0xff && bytes[1] == 0xd8 && bytes[2] == 0xff) return 'image/jpeg';
  if (listEquals(bytes.take(8).toList(), [137, 80, 78, 71, 13, 10, 26, 10])) return 'image/png';
  if (String.fromCharCodes(bytes.take(6)) == 'GIF87a' ||
      String.fromCharCodes(bytes.take(6)) == 'GIF89a') {
    return 'image/gif';
  }
  if (String.fromCharCodes(bytes.take(4)) == 'RIFF' &&
      String.fromCharCodes(bytes.skip(8).take(4)) == 'WEBP') {
    return 'image/webp';
  }
  return null;
}

class PhotoScanPage extends StatefulWidget {
  const PhotoScanPage({super.key, required this.study, this.picker});
  final Study study;
  final ImagePicker? picker;
  @override
  State<PhotoScanPage> createState() => _PhotoScanPageState();
}

class _PhotoScanPageState extends State<PhotoScanPage> {
  late final picker = widget.picker ?? ImagePicker();
  bool checking = true;
  bool eligible = false;
  bool selecting = false;
  bool scanning = false;
  Uint8List? image;
  String? mime;
  String? error;
  String answer = '';
  String mode = 'ask';
  late String subject = widget.study.subjects.firstOrNull?['name']?.toString() ?? 'Mathematics';
  bool get busy => checking || selecting || scanning;

  @override
  void initState() { super.initState(); checkAccess(recover: true); }

  Future<void> checkAccess({bool recover = false}) async {
    setState(() { checking = true; error = null; });
    try {
      final allowed = !widget.study.demo && await widget.study.api.photoScanEnabled();
      if (!mounted) return;
      setState(() => eligible = allowed);
      if (allowed && recover && !kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
        final lost = await picker.retrieveLostData();
        if (lost.exception != null) throw lost.exception!;
        if (lost.files?.isNotEmpty == true) await setImage(lost.files!.first);
      }
    } catch (failure) {
      if (mounted) setState(() { eligible = false; error = '$failure'; });
    } finally {
      if (mounted) setState(() => checking = false);
    }
  }

  Future<void> setImage(XFile file) async {
    if (await file.length() > 5 * 1024 * 1024) {
      throw const ApiException('The photo is too large. Choose a photo smaller than 5 MB.');
    }
    final bytes = await file.readAsBytes();
    final type = scanImageMime(bytes);
    if (type == null) {
      throw const ApiException('This photo format is not supported. Choose a JPEG, PNG, WebP, or GIF image.');
    }
    if (mounted) setState(() { image = bytes; mime = type; answer = ''; error = null; });
  }

  Future<void> choose(ImageSource source) async {
    if (busy || !eligible) return;
    setState(() { selecting = true; error = null; });
    try {
      final file = await picker.pickImage(source: source, maxWidth: 1800, maxHeight: 1800,
        imageQuality: 85, requestFullMetadata: false);
      if (file != null && mounted) await setImage(file);
    } on PlatformException catch (failure) {
      if (mounted) {
        setState(() => error = failure.code.contains('denied') || failure.code.contains('restricted')
          ? 'Camera or photo access is disabled. Allow access in your device settings.'
          : 'The camera or photo library is unavailable. Try choosing a photo from your gallery.');
      }
    } catch (failure) {
      if (mounted) setState(() { image = null; mime = null; answer = ''; error = '$failure'; });
    } finally {
      if (mounted) setState(() => selecting = false);
    }
  }

  Future<void> scan() async {
    if (busy || !eligible || image == null || mime == null) return;
    setState(() { scanning = true; answer = ''; error = null; });
    try {
      await for (final text in widget.study.api.scanPhoto(image!, mimeType: mime!, subject: subject, mode: mode)) {
        if (!mounted) break;
        setState(() => answer = text);
      }
    } on ApiException catch (failure) {
      if (mounted) {
        setState(() {
          error = failure.message;
          if (failure.status == 402 || failure.status == 401 || failure.status == 403) eligible = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => error = 'The scan could not be completed. Please try again.');
    } finally {
      if (mounted) setState(() => scanning = false);
    }
  }

  Future<void> viewPlan() async {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => FeaturePage(study: widget.study,
      feature: features.firstWhere((feature) => feature.id == 'subscription'))));
    if (mounted) await checkAccess();
  }

  @override
  Widget build(BuildContext context) {
    final subjects = {subject, ...widget.study.subjects.map((item) => '${item['name']}')};
    return Scaffold(appBar: AppBar(title: const Text('Photo Scan'), actions: [
      IconButton(tooltip: 'Check subscription', onPressed: busy ? null : () => checkAccess(), icon: const Icon(Icons.refresh_rounded)),
    ]), body: SafeArea(child: Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 720),
      child: ListView(padding: const EdgeInsets.all(22), children: [
        Container(color: orange, padding: const EdgeInsets.all(22), child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(Icons.document_scanner_rounded, color: Colors.white, size: 38), SizedBox(height: 18),
          Text('A photo.\nA little clarity.', style: TextStyle(color: Colors.white, fontSize: 28, height: 1.25, fontWeight: FontWeight.w900)),
        ])),
        if (checking) const Padding(padding: EdgeInsets.symmetric(vertical: 22), child: LinearProgressIndicator()),
        if (!checking && !eligible) ...[
          Notice(widget.study.demo ? 'Demo preview. Sign in with an eligible subscription to scan your work.'
            : error == null ? 'An active subscription is required for Photo Scan.' : error!,
            icon: Icons.lock_outline, onRetry: error == null ? null : () => checkAccess()),
          FilledButton.icon(onPressed: busy ? null : viewPlan, icon: const Icon(Icons.card_membership_outlined), label: const Text('View my plan')),
        ],
        if (eligible) ...[
          const SizedBox(height: 22), DropdownButtonFormField<String>(initialValue: subject, isExpanded: true,
            decoration: const InputDecoration(labelText: 'Subject', prefixIcon: Icon(Icons.auto_stories_outlined)),
            items: subjects.map((value) => DropdownMenuItem(value: value, child: Text(value, overflow: TextOverflow.ellipsis))).toList(),
            onChanged: busy ? null : (value) => setState(() => subject = value!)),
          const SizedBox(height: 16), SegmentedButton<String>(segments: const [
            ButtonSegment(value: 'ask', label: Text('Solve'), icon: Icon(Icons.lightbulb_outline)),
            ButtonSegment(value: 'mark', label: Text('Check work'), icon: Icon(Icons.fact_check_outlined)),
          ], selected: {mode}, onSelectionChanged: busy ? null : (values) => setState(() => mode = values.first)),
          const SizedBox(height: 18),
          Wrap(spacing: 10, runSpacing: 10, children: [
            FilledButton.icon(onPressed: busy ? null : () => choose(ImageSource.camera),
              icon: const Icon(Icons.camera_alt_outlined), label: const Text('Take photo')),
            OutlinedButton.icon(onPressed: busy ? null : () => choose(ImageSource.gallery),
              style: OutlinedButton.styleFrom(minimumSize: const Size(48, 52)),
              icon: const Icon(Icons.photo_library_outlined), label: const Text('Choose photo')),
          ]),
          if (image != null) ...[
            const SizedBox(height: 18), Stack(children: [
              ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.memory(image!, width: double.infinity, height: 260,
                fit: BoxFit.contain, semanticLabel: 'Selected homework or question photo',
                errorBuilder: (_, _, _) => const Notice('This image cannot be previewed. Choose another photo.'))),
              Positioned(right: 4, top: 4, child: IconButton.filled(tooltip: 'Remove photo',
                onPressed: busy ? null : () => setState(() { image = null; mime = null; answer = ''; error = null; }),
                icon: const Icon(Icons.close))),
            ]),
            const SizedBox(height: 14), const Text('Your photo will be sent securely for AI analysis.', style: TextStyle(fontSize: 12)),
            const SizedBox(height: 14), FilledButton.icon(onPressed: busy ? null : scan,
              icon: const Icon(Icons.auto_awesome), label: Text(scanning ? 'Reading your work...' : 'Get answer')),
          ],
        ],
        if (selecting || scanning) const Padding(padding: EdgeInsets.symmetric(vertical: 16), child: LinearProgressIndicator()),
        if (eligible && error != null) Notice(error!, icon: Icons.error_outline),
        if (answer.isNotEmpty) ...[
          Row(children: [const Expanded(child: SectionTitle('Your answer')),
            IconButton(tooltip: 'Copy answer', onPressed: scanning ? null : () async {
              await Clipboard.setData(ClipboardData(text: answer));
              if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Answer copied.')));
            }, icon: const Icon(Icons.copy_outlined)),
          ]),
          MarkdownBody(data: answer, selectable: true,
            styleSheet: MarkdownStyleSheet.fromTheme(Theme.of(context)).copyWith(p: const TextStyle(fontSize: 16, height: 1.8))),
          const SizedBox(height: 20),
        ],
      ]),
    ))));
  }
}