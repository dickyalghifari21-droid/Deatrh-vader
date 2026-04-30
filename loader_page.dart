// ignore_for_file: use_build_context_synchronously
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/status.dart' as status;
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';
import 'package:http/http.dart' as http;
import 'dart:ui';
import 'package:provider/provider.dart';
import 'theme_provider.dart';
import 'color_settings_sheet.dart';

import 'TestFunc.dart';
import 'telegram.dart';
import 'admin_page.dart';
import 'home_page.dart';
import 'seller_page.dart';
import 'change_password_page.dart';
import 'ddos_page.dart';
import 'chat_page.dart';
import 'login_page.dart';
import 'custom_bug.dart';
import 'bug_group.dart';
import 'ddos_panel.dart';
import 'sender_page.dart';
import 'spams_page.dart';
import 'public_page.dart';
import 'device_dashboard.dart';

// ─── Theme: warna dari ThemeProvider (dynamic) ───────────────────────────────
// Getter tersedia di _DashboardPageState

class DashboardPage extends StatefulWidget {
  final String username;
  final String password;
  final String role;
  final String expiredDate;
  final String sessionKey;
  final List<Map<String, dynamic>> listBug;
  final List<Map<String, dynamic>> listPayload;
  final List<Map<String, dynamic>> listDDoS;
  final List<dynamic> news;

  const DashboardPage({
    super.key,
    required this.username,
    required this.password,
    required this.role,
    required this.expiredDate,
    required this.listBug,
    required this.listPayload,
    required this.listDDoS,
    required this.sessionKey,
    required this.news,
  });

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage>
    with SingleTickerProviderStateMixin {
  // ── Theme getters ──────────────────────────────────────────────────────────
  ThemeProvider get _tp       => context.read<ThemeProvider>();
  Color get kCyan             => _tp.primaryColor;
  Color get kRed              => _tp.primaryColor;
  Color get kRedLight         => _tp.accentColor;
  Color get kNavy             => _tp.isDarkMode ? const Color(0xFF0D1B2A) : const Color(0xFFF0F4F8);
  Color get kNavyCard         => _tp.isDarkMode ? const Color(0xFF112233) : const Color(0xFFFFFFFF);
  Color get kNavyBorder       => _tp.primaryColor.withOpacity(0.3);
  static const Color kText    = Colors.white;
  Color get kTextDim          => Colors.white.withOpacity(0.5);
  late AnimationController _controller;
  late Animation<double>   _animation;
  late WebSocketChannel    channel;

  late String   sessionKey;
  late String   username;
  late String   password;
  late String   role;
  late String   expiredDate;
  late List<Map<String, dynamic>> listBug;
  late List<Map<String, dynamic>> listPayload;
  late List<Map<String, dynamic>> listDDoS;
  late List<dynamic> newsList;
  String androidId = "unknown";

  int _selectedIndex = 0;
  Widget _selectedPage = const Placeholder();

  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final PageController _pageController =
      PageController(viewportFraction: 0.92);
  int _currentNewsIndex = 0;

  List<Map<String, dynamic>> _activityLogs  = [];
  bool _isLoadingActivityLogs = false;
  bool _hasActivityLogsError  = false;

  Offset _assistiveTouchPosition = const Offset(20, 150);
  bool   _isAssistiveMenuOpen    = false;
  String _activePage             = 'home';

  int onlineUsers  = 0;
  int connections  = 0;
  
  Widget _menuItem(IconData icon, String title, String route) {
    return GestureDetector(
      onTap: () {
        Navigator.pop(context); // tutup drawer
        _onMenuItemTap(route);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            Icon(icon, color: Colors.white70, size: 20),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(color: Colors.white, fontSize: 15),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── init ──────────────────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

    sessionKey  = widget.sessionKey;
    username    = widget.username;
    password    = widget.password;
    role        = widget.role;
    expiredDate = widget.expiredDate;
    listBug     = widget.listBug;
    listPayload = widget.listPayload;
    listDDoS    = widget.listDDoS;
    newsList    = widget.news;

    _controller = AnimationController(
        duration: const Duration(milliseconds: 400), vsync: this);
    _animation = CurvedAnimation(parent: _controller, curve: Curves.easeInOut);
    _controller.forward();

    _selectedPage = _buildHomePage();
    _initAndroidIdAndConnect();
    _fetchActivityLogs();
  }

  Future<void> _initAndroidIdAndConnect() async {
    final deviceInfo = await DeviceInfoPlugin().androidInfo;
    if (mounted) setState(() => androidId = deviceInfo.id);
    _connectToWebSocket();
  }

  void _connectToWebSocket() {
    channel = WebSocketChannel.connect(
        Uri.parse('http://kasaprivate01.angkasanyabobo.my.id:1328'));
    channel.sink.add(jsonEncode(
        {"type": "validate", "key": sessionKey, "androidId": androidId}));
    channel.sink.add(jsonEncode({"type": "stats"}));

    channel.stream.listen((event) {
      final data = jsonDecode(event);
      if (data['type'] == 'myInfo' && data['valid'] == false) {
        final reason = data['reason'];
        if (reason == 'androidIdMismatch') {
          _handleInvalidSession(
              "Your account has logged on another device.");
        } else if (reason == 'keyInvalid') {
          _handleInvalidSession(
              "Key is not valid. Please login again.");
        }
      } else if (data['type'] == 'stats' && mounted) {
        setState(() {
          onlineUsers = data['online']      ?? 0;
          connections = data['connections'] ?? 0;
        });
      }
    });
  }

  Future<void> _fetchActivityLogs() async {
    if (!mounted) return;
    setState(() {
      _isLoadingActivityLogs = true;
      _hasActivityLogsError  = false;
    });
    try {
      final response = await http.get(Uri.parse(
          'http://kasaprivate01.angkasanyabobo.my.id:1328/api/user/getActivityLogs?key=$sessionKey'));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['valid'] == true && data['logs'] != null) {
          if (mounted) {
            setState(() {
              _activityLogs          = List<Map<String, dynamic>>.from(data['logs']);
              _isLoadingActivityLogs = false;
            });
          }
        } else {
          if (mounted) setState(() { _isLoadingActivityLogs = false; _hasActivityLogsError = true; });
        }
      } else {
        if (mounted) setState(() { _isLoadingActivityLogs = false; _hasActivityLogsError = true; });
      }
    } catch (e) {
      if (mounted) setState(() { _isLoadingActivityLogs = false; _hasActivityLogsError = true; });
    }
  }

  void _handleInvalidSession(String message) async {
    await Future.delayed(const Duration(milliseconds: 300));
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        backgroundColor: kNavy,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: BorderSide(color: kCyan.withOpacity(0.4))),
        title: Text("⚠️ Session Expired",
            style: TextStyle(color: kText, fontFamily: "Orbitron")),
        content: Text(message,
            style:  TextStyle(color: kTextDim, fontFamily: "ShareTechMono")),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginPage()),
                  (r) => false),
              child: Text("OK", style: TextStyle(color: kCyan))),
        ],
      ),
    );
  }

  // ─── Navigation ────────────────────────────────────────────────────────────
  void _selectFromDrawer(String page) {
    if (page == 'account') {
      setState(() { _isAssistiveMenuOpen = false; });
      _showAccountMenu();
      return;
    }
    if (page == 'color') {
      setState(() => _isAssistiveMenuOpen = false);
      showColorSettingsSheet(context);
      return;
    }
    if (page == 'rat') {
      setState(() {
        _isAssistiveMenuOpen = false;
        _activePage = 'rat';
        _selectedPage = DeviceDashboardPage(username: username);
      });
      _controller.reset(); _controller.forward();
      return;
    }

    setState(() { _isAssistiveMenuOpen = false; _activePage = page; });
    Widget next = _buildHomePage();

    if (page == 'home') {
      next = _buildHomePage();
    } else if (page == 'bug') {
      next = AttackPage(
          username: username, password: password,
          listBug: listBug, role: role,
          expiredDate: expiredDate, sessionKey: sessionKey);
    } else if (page == 'custom_bug') {
      next = CustomAttackPage(
          username: username, password: password,
          listPayload: listPayload, role: role,
          expiredDate: expiredDate, sessionKey: sessionKey);
    } else if (page == 'group_bug') {
      next = GroupBugPage(
          username: username, password: password,
          role: role, expiredDate: expiredDate, sessionKey: sessionKey);
    } else if (page == 'telegram') {
      next = TelegramSpamPage(sessionKey: sessionKey);
    } else if (page == 'ddos') {
      next = AttackPanel(sessionKey: sessionKey, listDDoS: listDDoS);
    } else if (page == 'tools') {
      next = ToolsPage(sessionKey: sessionKey, userRole: role);
    } else if (page == 'reseller') {
      next = SellerPage(keyToken: sessionKey);
    } else if (page == 'admin') {
      next = AdminPage(sessionKey: sessionKey, role: role);
    } else if (page == 'sender') {
      next = SenderPage(sessionKey: sessionKey, userRole: role);
    } else if (page == 'add_sender') {
      next = SenderPage(sessionKey: sessionKey, userRole: role, openAddOnLoad: true);
    }

    setState(() { _selectedPage = next; _controller.reset(); _controller.forward(); });
  }

  // ─── HOME PAGE ─────────────────────────────────────────────────────────────
  Widget _buildHomePage() {
    return RefreshIndicator(
      color: kCyan,
      onRefresh: () async {
        await _fetchActivityLogs();
        await Future.delayed(const Duration(seconds: 1));
        setState(() {});
      },
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          // space for header
          SliverToBoxAdapter(
              child: SizedBox(
                  height: MediaQuery.of(context).padding.top + 110)),
          // stats bar
          SliverToBoxAdapter(child: _buildStatsBar()),
          const SliverToBoxAdapter(child: SizedBox(height: 18)),
          // "Berita Terbaru" label
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(children: [
                Container(width: 4, height: 22,
                    decoration: BoxDecoration(color: kRed, borderRadius: BorderRadius.circular(2))),
                const SizedBox(width: 10),
                Text("Berita Terbaru",
                    style: TextStyle(color: kText, fontFamily: "Orbitron",
                        fontWeight: FontWeight.bold, fontSize: 16)),
                const Spacer(),
                Text("${newsList.length} artiksi",
                    style:  TextStyle(color: kTextDim,
                        fontFamily: "ShareTechMono", fontSize: 12)),
              ]),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 12)),
          // news carousel
          SliverToBoxAdapter(child: _buildNewsCarousel()),
          const SliverToBoxAdapter(child: SizedBox(height: 22)),
          // shrine status
          SliverToBoxAdapter(child: _buildShrineStatusCard()),
          const SliverToBoxAdapter(child: SizedBox(height: 120)),
        ],
      ),
    );
  }

  // ─── STATS BAR ─────────────────────────────────────────────────────────────
  Widget _buildStatsBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        decoration: BoxDecoration(
            color: kNavyCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: kNavyBorder)),
        child: Row(children: [
          // Online
          Icon(Icons.people_outline, color: kRedLight, size: 22),
          const SizedBox(width: 8),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text("$onlineUsers",
                style: TextStyle(color: kText,
                    fontFamily: "ShareTechMono",
                    fontWeight: FontWeight.bold, fontSize: 16)),
            Text("Online",
                style: TextStyle(color: kTextDim,
                    fontFamily: "ShareTechMono", fontSize: 11)),
          ]),
          const SizedBox(width: 20),
          Container(width: 1, height: 36, color: kNavyBorder),
          const SizedBox(width: 20),
          // Koneksi
          Icon(Icons.wifi, color: kRedLight, size: 22),
          const SizedBox(width: 8),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text("$connections",
                style: TextStyle(color: kText,
                    fontFamily: "ShareTechMono",
                    fontWeight: FontWeight.bold, fontSize: 16)),
            Text("Koneksi",
                style: TextStyle(color: kTextDim,
                    fontFamily: "ShareTechMono", fontSize: 11)),
          ]),
          const Spacer(),
          // LIVE button
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
            decoration: BoxDecoration(
                color: kRed,
                borderRadius: BorderRadius.circular(10),
                boxShadow: [BoxShadow(color: kRed.withOpacity(0.35),
                    blurRadius: 10, spreadRadius: 1)]),
            child: Text("LIVE",
                style: TextStyle(color: kText,
                    fontFamily: "Orbitron",
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    letterSpacing: 1.5)),
          ),
        ]),
      ),
    );
  }

  // ─── NEWS CAROUSEL ─────────────────────────────────────────────────────────
  Widget _buildNewsCarousel() {
    if (newsList.isEmpty) {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 16),
        height: 180,
        decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            color: kNavyCard,
            border: Border.all(color: kNavyBorder)),
        child: Center(
            child: Text("Tidak ada berita",
                style: TextStyle(color: kTextDim, fontFamily: "ShareTechMono"))),
      );
    }

    return Column(children: [
      SizedBox(
        height: 280,
        child: PageView.builder(
          controller: _pageController,
          itemCount: newsList.length,
          onPageChanged: (i) => setState(() => _currentNewsIndex = i),
          itemBuilder: (context, index) {
            final item = newsList[index];
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 8),
              decoration: BoxDecoration(
                  color: kNavyCard,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: kNavyBorder, width: 1.5),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.5),
                        blurRadius: 10, offset: const Offset(0, 4))
                  ]),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    flex: 6,
                    child: ClipRRect(
                      borderRadius:
                          const BorderRadius.vertical(top: Radius.circular(14)),
                      child: Stack(fit: StackFit.expand, children: [
                        if (item['image'] != null &&
                            item['image'].toString().isNotEmpty)
                          NewsMedia(url: item['image'])
                        else
                          Container(color: Colors.black26),
                        // "BERITA" badge
                        Positioned(
                          top: 10, left: 12,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                                color: kRed,
                                borderRadius: BorderRadius.circular(6)),
                            child: Text("BERITA",
                                style: TextStyle(color: kText,
                                    fontFamily: "ShareTechMono",
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ]),
                    ),
                  ),
                  Expanded(
                    flex: 4,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(item['title'] ?? "NoMercy",
                                style: TextStyle(color: kText,
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    fontFamily: "Orbitron"),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis),
                            const SizedBox(height: 6),
                            Text(
                                "Diberdayakan Oleh @${username.toLowerCase()}",
                                style:  TextStyle(color: kTextDim,
                                    fontSize: 12,
                                    fontFamily: "ShareTechMono")),
                          ]),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
      if (newsList.length > 1)
        Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              newsList.length,
              (i) => AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                margin: const EdgeInsets.symmetric(horizontal: 4),
                height: 6,
                width: _currentNewsIndex == i ? 24 : 8,
                decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    color: _currentNewsIndex == i
                        ? kRed
                        : Colors.white.withOpacity(0.2)),
              ),
            ),
          ),
        ),
    ]);
  }

  // ─── SHRINE STATUS ─────────────────────────────────────────────────────────
  Widget _buildShrineStatusCard() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
          color: kNavyCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: kCyan.withOpacity(0.45), width: 1.5),
          boxShadow: [
            BoxShadow(color: kCyan.withOpacity(0.08),
                blurRadius: 18, spreadRadius: 2)
          ]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(Icons.shield_outlined, color: kCyan, size: 20),
          const SizedBox(width: 10),
          Text("STATUS SHRINE",
              style: TextStyle(color: kCyan,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  fontFamily: "Orbitron",
                  letterSpacing: 2.0)),
        ]),
        const SizedBox(height: 18),
        _statusRow("Nama Pengguna", username),
        _statusRow("Peran", role.toUpperCase()),
        _statusRow("Kedaluwarsa", expiredDate.split(' ').first),
        _statusRow("Pengguna Online", onlineUsers.toString()),
      ]),
    );
  }

  Widget _statusRow(String label, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.3),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withOpacity(0.05))),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label,
            style:  TextStyle(color: kTextDim,
                fontSize: 13, fontFamily: "ShareTechMono", letterSpacing: 0.8)),
        Text(value,
            style: TextStyle(color: kText,
                fontSize: 13,
                fontWeight: FontWeight.bold,
                fontFamily: "ShareTechMono",
                letterSpacing: 0.8)),
      ]),
    );
  }

  // ─── TOP BAR ───────────────────────────────────────────────────────────────
  Widget _buildHeader() {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.only(
          top: MediaQuery.of(context).padding.top + 10,
          bottom: 12, left: 20, right: 20),
      decoration: BoxDecoration(
          color: kNavy.withOpacity(0.97),
          border: Border(
              bottom: BorderSide(color: kNavyBorder, width: 1))),
      child: Row(children: [
         Icon(Icons.menu, color: kTextDim, size: 22),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text("Halo, $username 👋",
                style: TextStyle(color: kText,
                    fontFamily: "Orbitron",
                    fontWeight: FontWeight.bold,
                    fontSize: 14)),
            const SizedBox(height: 3),
            Row(children: [
              Container(width: 7, height: 7,
                  decoration: const BoxDecoration(
                      color: Colors.green, shape: BoxShape.circle)),
              const SizedBox(width: 5),
              Text(role.toUpperCase(),
                  style:  TextStyle(color: kTextDim,
                      fontFamily: "ShareTechMono", fontSize: 11)),
              const SizedBox(width: 8),
              Text("· Exp: $expiredDate",
                  style:  TextStyle(color: kTextDim,
                      fontFamily: "ShareTechMono", fontSize: 11)),
            ]),
          ]),
        ),
         Icon(FontAwesomeIcons.headset, color: kTextDim, size: 18),
        const SizedBox(width: 18),
        GestureDetector(
          onTap: _showAccountMenu,
          child:  Icon(FontAwesomeIcons.userCircle,
              color: kTextDim, size: 20),
        ),
      ]),
    );
  }

  // ─── ACCOUNT MENU ──────────────────────────────────────────────────────────
  void _showAccountMenu() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => Padding(
        padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom),
        child: _glassCard(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text("Account Info",
                  style: TextStyle(color: kText,
                      fontSize: 20, fontFamily: "Orbitron")),
              const SizedBox(height: 12),
              _infoCard(Icons.person, "Username", username),
              _infoCard(Icons.date_range, "Expired", expiredDate),
              _infoCard(Icons.security, "Role", role),
              const SizedBox(height: 20),
              _glassButton(
                icon: const Icon(Icons.lock_reset),
                label: Text("Change Password"),
                onPressed: () {
                  Navigator.pop(context);
                  setState(() {
                    _activePage   = 'change_password';
                    _selectedPage = ChangePasswordPage(
                        username: username, sessionKey: sessionKey);
                    _controller.reset(); _controller.forward();
                  });
                },
              ),
              const SizedBox(height: 10),
              _glassButton(
                icon: const Icon(Icons.logout),
                label: Text("Logout"),
                onPressed: () async {
                  final prefs = await SharedPreferences.getInstance();
                  await prefs.clear();
                  if (!mounted) return;
                  Navigator.of(context).pushAndRemoveUntil(
                      MaterialPageRoute(builder: (_) => const LoginPage()),
                      (r) => false);
                },
              ),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _glassCard({required Widget child}) {
    return Container(
      decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          color: kNavy.withOpacity(0.95),
          border: Border.all(color: kNavyBorder)),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
            child: child),
      ),
    );
  }

  Widget _glassButton(
      {required Icon icon, required Text label, required VoidCallback onPressed}) {
    return ElevatedButton.icon(
      icon: icon,
      label: label,
      style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          foregroundColor: kText,
          shadowColor: Colors.transparent,
          padding: const EdgeInsets.symmetric(vertical: 12),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: kCyan.withOpacity(0.3)))),
      onPressed: onPressed,
    );
  }

  Widget _infoCard(IconData icon, String label, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.3),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: kNavyBorder)),
      child: Row(children: [
        Icon(icon, color: kCyan),
        const SizedBox(width: 10),
        Text("$label:", style:  TextStyle(color: kTextDim, fontWeight: FontWeight.bold)),
        const Spacer(),
        Text(value, style: TextStyle(color: kText, fontFamily: "ShareTechMono")),
      ]),
    );
  }

  // ─── ASSISTIVE MENU ────────────────────────────────────────────────────────
Widget _buildAssistiveMenu() {
  final cur = role.toLowerCase();
  final canAdmin    = ['dev','ceo','high admin','owner','admin','reseller','reseller1'].contains(cur);
  final canSeller   = canAdmin;
  final canAllBugs  = ['dev','ceo','high admin','owner','admin','vip','reseller','reseller1'].contains(cur);
  
  // State untuk submenu bug nomor
  bool _showBugSubmenu = false;

  return Container(
    width: 240,
    decoration: BoxDecoration(
        color: kNavy,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kNavyBorder),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.6),
            blurRadius: 15, offset: const Offset(0, 5))]),
    child: ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 8),
              _menuItem(Icons.home, "Beranda", 'home'),
              
              // 🔥 BUG NOMOR DENGAN SUB-MENU 🔥
              StatefulBuilder(
                builder: (context, setState) {
                  return Column(
                    children: [
                      // Parent menu: Bug Nomor
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _showBugSubmenu = !_showBugSubmenu;
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          child: Row(
                            children: [
                              Icon(FontAwesomeIcons.whatsapp, color: Colors.white70, size: 20),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Text(
                                  "Bug",
                                  style: const TextStyle(color: Colors.white, fontSize: 15),
                                ),
                              ),
                              Icon(
                                _showBugSubmenu ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                color: Colors.white54,
                                size: 18,
                              ),
                            ],
                          ),
                        ),
                      ),
                      // Submenu (muncul jika _showBugSubmenu true)
                      if (_showBugSubmenu)
                        Column(
                          children: [
                            _subMenuItem(Icons.numbers, "Bug Nomor", 'bug'),
                            _subMenuItem(Icons.code, "Custom Bug", 'custom_bug'),
                            _subMenuItem(Icons.group, "Bug Group", 'bug_group'),
                          ],
                        ),
                    ],
                  );
                },
              ),
              
              _menuItem(FontAwesomeIcons.paperPlane, "Spam", 'telegram'),
              _menuItem(Icons.phone_android, "RAT (Tikus)", 'rat'),
              _menuItem(FontAwesomeIcons.screwdriverWrench, "Tools", 'tools'),
              _menuItem(Icons.security, "DDoS Attack", 'ddos'),
              const Divider(color: Colors.white12, height: 16,
                  thickness: 1, indent: 16, endIndent: 16),
              _menuItem(Icons.person, "Account Info", 'account'),
              if (canSeller)
                _menuItem(Icons.store, "Seller Panel", 'reseller'),
              if (canAdmin)
                _menuItem(Icons.admin_panel_settings, "Admin Panel", 'admin'),
              _menuItem(Icons.person_add_alt_1, "Add Sender", 'add_sender'),
              _menuItem(Icons.palette_outlined, "Color Settings", 'color'),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
    ),
  );
}

// Fungsi untuk sub-menu item
Widget _subMenuItem(IconData icon, String title, String route) {
  return GestureDetector(
    onTap: () {
      Navigator.pop(context); // tutup drawer
      if (route == 'custom_bug') {
        // Navigasi ke halaman Custom Bug
        Navigator.push(context, MaterialPageRoute(builder: (_) => CustomBugPage()));
      } else if (route == 'bug_group') {
        // Navigasi ke halaman Bug Group
        Navigator.push(context, MaterialPageRoute(builder: (_) => BugGroupPage()));
      } else {
        // Navigasi ke halaman Bug Nomor biasa
        Navigator.push(context, MaterialPageRoute(builder: (_) => BugNomorPage()));
      }
    },
    child: Container(
      padding: const EdgeInsets.only(left: 48, right: 16, top: 8, bottom: 8),
      child: Row(
        children: [
          Icon(icon, color: Colors.white54, size: 18),
          const SizedBox(width: 12),
          Text(
            title,
            style: const TextStyle(color: Colors.white70, fontSize: 13),
          ),
        ],
      ),
    ),
  );
}

  // ─── FLOATING NAV BAR ──────────────────────────────────────────────────────
Widget _buildFloatingNavBar() {
  return Positioned(
    bottom: 24,
    left: 12,
    right: 12,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      decoration: BoxDecoration(
          color: kNavy.withOpacity(0.97),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: kNavyBorder, width: 1.5),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.5),
                blurRadius: 20, spreadRadius: 2)
          ]),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _navItem(Icons.home_filled,          "Beranda",   'home'),
          
          // 🔥 BUG NOMOR DENGAN POPUP SUBMENU 🔥
          GestureDetector(
            onTap: () => _showBugSubmenuPopup(context),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(FontAwesomeIcons.whatsapp, color: Colors.white70, size: 22),
                const SizedBox(height: 4),
                Text("Bug", style: TextStyle(color: Colors.white70, fontSize: 10)),
              ],
            ),
          ),
          
          _navItem(FontAwesomeIcons.paperPlane, "Spam",      'telegram'),
          _navItem(Icons.phone_android,         "Tikus",     'rat'),
          _navItem(Icons.more_horiz,            "Lainnya",   'more'),
        ],
      ),
    ),
  );
}

// ========== FUNGSI POPUP SUBMENU BUG ==========
void _showBugSubmenuPopup(BuildContext context) {
  showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (context) => Container(
      decoration: BoxDecoration(
        color: kNavy,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        border: Border.all(color: kNavyBorder),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
          Container(
            margin: EdgeInsets.symmetric(vertical: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.white30,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          
          // Header
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Icon(FontAwesomeIcons.whatsapp, color: kRedLight, size: 24),
                SizedBox(width: 12),
                Text(
                  "PILIH JENIS BUG",
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'Orbitron',
                  ),
                ),
              ],
            ),
          ),
          
          Divider(color: Colors.white12, height: 1),
          
          // Menu Bug Nomor
          _buildBottomSheetMenuItem(
            icon: Icons.numbers,
            title: "Bug Nomor",
            subtitle: "Kirim bug ke nomor WhatsApp",
            onTap: () {
              Navigator.pop(context);
              Navigator.push(context, MaterialPageRoute(builder: (_) => BugNomorPage()));
            },
          ),
          
          // Menu Custom Bug
          _buildBottomSheetMenuItem(
            icon: Icons.code,
            title: "Custom Bug",
            subtitle: "bug dengan custom",
            onTap: () {
              Navigator.pop(context);
              Navigator.push(context, MaterialPageRoute(builder: (_) => CustomBugPage()));
            },
          ),
          
          // Menu Bug Group
          _buildBottomSheetMenuItem(
            icon: Icons.group,
            title: "Bug Group",
            subtitle: "Kirim bug ke grup WhatsApp",
            onTap: () {
              Navigator.pop(context);
              Navigator.push(context, MaterialPageRoute(builder: (_) => BugGroupPage()));
            },
          ),
          
          SizedBox(height: 16),
        ],
      ),
    ),
  );
}

// ========== WIDGET ITEM BOTTOM SHEET ==========
Widget _buildBottomSheetMenuItem({
  required IconData icon,
  required String title,
  required String subtitle,
  required VoidCallback onTap,
}) {
  return ListTile(
    leading: Container(
      padding: EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: kRed.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, color: kRedLight, size: 22),
    ),
    title: Text(
      title,
      style: TextStyle(
        color: Colors.white,
        fontSize: 15,
        fontWeight: FontWeight.w500,
      ),
    ),
    subtitle: Text(
      subtitle,
      style: TextStyle(color: Colors.white54, fontSize: 11),
    ),
    trailing: Icon(Icons.arrow_forward_ios, color: kRedLight, size: 16),
    onTap: onTap,
  );
}

  Widget _navItem(IconData icon, String label, String page) {
    final isActive = _activePage == page;
    return GestureDetector(
      onTap: () {
        if (page == 'more') {
          setState(() => _isAssistiveMenuOpen = !_isAssistiveMenuOpen);
        } else {
          _selectFromDrawer(page);
        }
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: isActive
            ? BoxDecoration(
                color: kRed.withOpacity(0.15),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: kRed.withOpacity(0.5), width: 1.2))
            : const BoxDecoration(),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon,
              color: isActive ? kRedLight : kTextDim,
              size: 20),
          const SizedBox(height: 5),
          Text(label,
              style: TextStyle(
                  color: isActive ? kRedLight : kTextDim,
                  fontSize: 10,
                  fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                  fontFamily: "ShareTechMono")),
        ]),
      ),
    );
  }

  // ─── BUILD ─────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final isRightSide  = _assistiveTouchPosition.dx > (screenSize.width  / 2);
    final isBottomSide = _assistiveTouchPosition.dy > (screenSize.height / 2);

    return WillPopScope(
      onWillPop: () async {
        if (_activePage != 'home') { _selectFromDrawer('home'); return false; }
        return true;
      },
      child: Consumer<ThemeProvider>(
        builder: (context, tp, _) => Scaffold(
        key: _scaffoldKey,
        extendBodyBehindAppBar: true,
        backgroundColor: kNavy,
        body: Stack(children: [
          // body content
          SafeArea(
            top: false, bottom: false,
            child: FadeTransition(
                opacity: _animation, child: _selectedPage),
          ),

          // fixed header (only on home)
          if (_activePage == 'home')
            Positioned(
                top: 0, left: 0, right: 0,
                child: _buildHeader()),

          // dismiss overlay for assistive menu
          if (_isAssistiveMenuOpen)
            Positioned.fill(
              child: GestureDetector(
                onTap: () => setState(() => _isAssistiveMenuOpen = false),
                child: Container(color: Colors.transparent),
              ),
            ),

          // assistive menu popup
          AnimatedPositioned(
            duration: const Duration(milliseconds: 150),
            left:  isRightSide  ? _assistiveTouchPosition.dx - 250
                                : _assistiveTouchPosition.dx + 70,
            top:   isBottomSide ? _assistiveTouchPosition.dy - 380
                                : _assistiveTouchPosition.dy,
            child: AnimatedScale(
              scale: _isAssistiveMenuOpen ? 1.0 : 0.0,
              duration: const Duration(milliseconds: 250),
              curve: Curves.easeOutBack,
              alignment: isRightSide
                  ? (isBottomSide ? Alignment.bottomRight : Alignment.topRight)
                  : (isBottomSide ? Alignment.bottomLeft  : Alignment.topLeft),
              child: _buildAssistiveMenu(),
            ),
          ),

          // assistive touch button (draggable)
          Positioned(
            left: _assistiveTouchPosition.dx,
            top:  _assistiveTouchPosition.dy,
            child: GestureDetector(
              onPanUpdate: (d) {
                setState(() {
                  if (_isAssistiveMenuOpen) _isAssistiveMenuOpen = false;
                  double nx = (_assistiveTouchPosition.dx + d.delta.dx)
                      .clamp(0.0, screenSize.width  - 60.0);
                  double ny = (_assistiveTouchPosition.dy + d.delta.dy)
                      .clamp(0.0, screenSize.height - 120.0);
                  _assistiveTouchPosition = Offset(nx, ny);
                });
              },
              onTap: () => setState(
                  () => _isAssistiveMenuOpen = !_isAssistiveMenuOpen),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 58, height: 58,
                decoration: BoxDecoration(
                    color: _isAssistiveMenuOpen
                        ? kNavyCard
                        : Colors.black.withOpacity(0.55),
                    shape: BoxShape.circle,
                    border: Border.all(
                        color: _isAssistiveMenuOpen ? kCyan : kNavyBorder,
                        width: 1.5),
                    boxShadow: [
                      BoxShadow(
                          color: _isAssistiveMenuOpen
                              ? kCyan.withOpacity(0.4)
                              : Colors.black.withOpacity(0.5),
                          blurRadius: 12, spreadRadius: 2)
                    ]),
                child: ClipOval(
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
                    child: Padding(
                      padding: const EdgeInsets.all(13.0),
                      child: Image.asset('assets/images/logo.png',
                          fit: BoxFit.contain),
                    ),
                  ),
                ),
              ),
            ),
          ),

          // floating nav bar
          _buildFloatingNavBar(),
        ]),
      ),
      ),
    );
  }

  @override
  void dispose() {
    channel.sink.close(status.goingAway);
    _controller.dispose();
    _pageController.dispose();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }
}

// ─── NewsMedia ────────────────────────────────────────────────────────────────
class NewsMedia extends StatefulWidget {
  final String url;
  const NewsMedia({super.key, required this.url});
  @override State<NewsMedia> createState() => _NewsMediaState();
}

class _NewsMediaState extends State<NewsMedia> {
  VideoPlayerController? _controller;

  // ── Theme getter ──────────────────────────────────────────────────────────
  Color get kCyan { try { return context.read<ThemeProvider>().primaryColor; } catch(_) { return Colors.cyanAccent; } }

  @override
  void initState() {
    super.initState();
    if (_isVideo(widget.url)) {
      _controller =
          VideoPlayerController.networkUrl(Uri.parse(widget.url))
            ..initialize().then((_) {
              setState(() {});
              _controller?.setLooping(true);
              _controller?.setVolume(1.0);
              _controller?.play();
            });
    }
  }

  bool _isVideo(String url) =>
      url.endsWith(".mp4") || url.endsWith(".webm") ||
      url.endsWith(".mov") || url.endsWith(".mkv");

// ========== FUNGSI MENU ITEM ==========
Widget _menuItem(IconData icon, String title, String route) {
  return GestureDetector(
    onTap: () {
      Navigator.pop(context); // tutup drawer
      _onMenuItemTap(route);
    },
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          Icon(icon, color: Colors.white70, size: 20),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(color: Colors.white, fontSize: 15),
            ),
          ),
        ],
      ),
    ),
  );
}

// ========== FUNGSI SUB MENU ITEM ==========
Widget _subMenuItem(IconData icon, String title, String route) {
  return GestureDetector(
    onTap: () {
      Navigator.pop(context);
      _onMenuItemTap(route);
    },
    child: Container(
      padding: const EdgeInsets.only(left: 48, right: 16, top: 8, bottom: 8),
      child: Row(
        children: [
          Icon(icon, color: Colors.white54, size: 18),
          const SizedBox(width: 12),
          Text(
            title,
            style: const TextStyle(color: Colors.white70, fontSize: 13),
          ),
        ],
      ),
    ),
  );
}

// ========== FUNGSI NAVIGASI ==========
void _onMenuItemTap(String route) {
  switch (route) {
    case 'home':
      break;
    case 'bug':
      Navigator.push(context, MaterialPageRoute(builder: (_) => AttackPage(
        username: widget.username,
        password: widget.password,
        sessionKey: widget.sessionKey,
        listBug: widget.listBug,
        role: widget.role,
        expiredDate: widget.expiredDate,
      )));
      break;
    case 'custom_bug':
      // Arahkan ke halaman custom bug
      break;
    case 'bug_group':
      // Arahkan ke halaman bug group
      break;
    case 'telegram':
      Navigator.push(context, MaterialPageRoute(builder: (_) => SpamsPage(
        sessionKey: widget.sessionKey,
      )));
      break;
    case 'ddos':
      Navigator.push(context, MaterialPageRoute(builder: (_) => DdosPage(
        listDDoS: widget.listDDoS,
        sessionKey: widget.sessionKey,
      )));
      break;
    case 'reseller':
      Navigator.push(context, MaterialPageRoute(builder: (_) => SellerPage(
        keyToken: widget.sessionKey,
      )));
      break;
    case 'admin':
      Navigator.push(context, MaterialPageRoute(builder: (_) => AdminPage(
        sessionKey: widget.sessionKey,
        role: widget.role,
      )));
      break;
    case 'add_sender':
      Navigator.push(context, MaterialPageRoute(builder: (_) => SenderPage(
        sessionKey: widget.sessionKey,
      )));
      break;
    case 'color':
      showModalBottomSheet(
        context: context,
        builder: (_) => ColorSettingsSheet(),
      );
      break;
  }
}

  @override
  void dispose() { _controller?.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    if (_isVideo(widget.url)) {
      if (_controller != null && _controller!.value.isInitialized) {
        return AspectRatio(
            aspectRatio: _controller!.value.aspectRatio,
            child: VideoPlayer(_controller!));
      }
      return Center(
          child: CircularProgressIndicator(color: kCyan, strokeWidth: 2));
    }
    return Image.network(widget.url, fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Container(color: Colors.black26));
  }
}

