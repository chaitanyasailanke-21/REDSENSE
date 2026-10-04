import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/firebase_sync_service.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool _isLogin = true;
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final sync = context.watch<FirebaseSyncService>();

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440),
        child: Card(
          margin: const EdgeInsets.all(20),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  _isLogin ? 'Sign In to EzeCheck Cloud' : 'Create Patient Account',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 6),
                Text(
                  sync.currentUserEmail != null
                      ? 'Authenticated as ${sync.currentUserEmail}'
                      : 'Sync MAX30102 readings & ESP32-CAM captures across devices',
                  style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 20),
                if (!_isLogin) ...[
                  TextField(
                    controller: _nameCtrl,
                    decoration: const InputDecoration(labelText: 'Full Name', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                ],
                TextField(
                  controller: _emailCtrl,
                  decoration: const InputDecoration(labelText: 'Email Address', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _passwordCtrl,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () {
                    if (_isLogin) {
                      sync.signInWithEmail(_emailCtrl.text.trim(), _passwordCtrl.text);
                    } else {
                      sync.registerWithEmail(_emailCtrl.text.trim(), _passwordCtrl.text, _nameCtrl.text.trim());
                    }
                  },
                  child: Text(_isLogin ? 'Sign In' : 'Create Account'),
                ),
                TextButton(
                  onPressed: () => setState(() => _isLogin = !_isLogin),
                  child: Text(_isLogin ? 'Need an account? Register' : 'Already registered? Sign In'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
