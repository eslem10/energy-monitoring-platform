import 'dart:html' as html;
import 'dart:ui_web' as ui_web;
import 'package:flutter/material.dart';

Widget createWebView(String url) {
  ui_web.platformViewRegistry.registerViewFactory(
    'react-dashboard-iframe',
    (int viewId) => html.IFrameElement()
      ..src = url
      ..style.border = 'none'
      ..style.width = '100%'
      ..style.height = '100%',
  );

  return const HtmlElementView(viewType: 'react-dashboard-iframe');
}
