---
theme: geist
colorSchema: light

layout: center

drawings:
  persist: false

# slide transition: https://sli.dev/guide/animations.html#slide-transitions
transition: slide-left

# enable MDC Syntax: https://sli.dev/features/mdc
mdc: true
---

# Flutter公式パッケージにコントリビュートするまで
2025 10月 合宿LT - 2025/10/16 MS芝浦ビル

ジョブハウス開発 土方

---
layout: center
---

# 今日は

---
layout: center
---

# OSSはいいぞという話をします

---
layout: center
---

# OSSとは？といった話はしません

---
layout: center
---

## どうOSSと向き合うのか<br>どうやってOSSに関わるのかの話ができればと思います

---
layout: default
---
# 前提:

### ジョブハウスモバイルアプリ
<ul class="text-2xl">
  <li>Flutter/Dartで実装</li>
  <li>iOS/Androidにクロスプラットフォームで展開</li> 
</ul>

<div class="flex gap-4">
  <div class="w-1/2 aspect-[16/9]">
    <img src="/public/flutter.png" class="w-full h-full object-contain" />
  </div>
  <div class="w-1/4 aspect-[1/1]">
    <img src="/public/dart.png" class="w-full h-full object-contain" />
  </div>
</div>


---
layout: center
---

# ある日のこと 

---
layout: center
---

## いつものようにリリース前のQA依頼を終えて、<br>審査準備をしようかと思っていたところ、、☕️

---
layout: center
---

<div>
  <h2>QAからバグ報告が！！</h2>
</div>
<p v-click class="text-2xl">いつもありがとうございます、、、</p>


---
layout: center
---

# アプリのディープリンクにバグがあるよ！！

---
layout: default
---

# 参考）ディープリンクとは
<h2 class='text-xl'>
  iOS: Universal Link / Android: App Links
</h2>
<p>
  リンクをクリック→対応するアプリのViewに遷移させることができる
</p>
<p>
  アプリの実装で、遷移するリンクに応じて<strong>処理を切り替えたりすること</strong>も可能
</p>

---
layout: default
---

<div class='flex flex-row gap-6'>
  <div class='flex-1 flex flex-col justify-center text-left'>
    <h2 v-click>ディープリンクからの遷移時に<br/>検索条件が切り替わらない！！</h2>
    <ul class='m-0 p-0' v-click>
      <li>※領域ごとにモードをディープリンクで切り替える機能</li>
    </ul>
    <ul v-click>
      <li>✅ jobhouse.jp/factory -> <strong>工場</strong>のモード(添付画像) </li>
      <li>❌ jobhouse.jp -> <strong>全領域</strong>のモード</li> 
    </ul>
  </div>
  <div class='flex-1 flex justify-center mt-4' v-click>
    <img src='/public/app_search.png' class='w-1/2'/>
  </div>
</div>

---
layout: center
---

## しかも、Androidでコールドスタート※でのみ再現
<p>※アプリをキルした状態</p>
<p class="text-2xl font-bold" v-click>どういうわけかiOSは大丈夫</p>

---
layout: center
---

# はて、、、🤔

---
layout: center
---

# 調査開始🤩


---
layout: center
---

# まずはアプリケーションの実装を疑う


---
layout: default
---

# 怪しい場所を探索
<h3 v-click> 1.Androidのディープリンク定義ファイル(xml定義) </h3>
<h3 v-click> 2.アプリケーションのRouting定義（routes.rbみたいなもの）</h3>

---
layout: center
---

# 地道に調査...
ドキュメント読んだり、ログを埋め込んだり

---
layout: default
---
<div class="mt-8">

```dart{all|14-17}{maxHeight: '450px', class:'!children:text-xs mt-8'}
// ジョブハウスのアプリケーションコード
// 1つ1つのクラスがRoutingの定義にあたる
class HorizontalRootRoute extends GoRouteData with HorizontalNamespaceMixin {
  static const name = 'horizontal';
  static const _path = '/';

  const HorizontalRootRoute();
  @override
  Widget build(BuildContext context, GoRouterState state) {
    return const ArticlesRootPage();
  }

  @override
  FutureOr<String?> redirect(BuildContext context, GoRouterState state) async {
    // ディープリンクから起動した際は、namespaceのモードを同期する
    if (state.uri.host.isNotEmpty) {
      await sync(context);
    }
    return null;
  }
}
```

</div>

<p class="text-lg font-bold" v-click>わかった！！androidの時だけ、検索条件更新のためのsyncが呼ばれていない</p>

---
layout: center
---

# でもなんでだ、、、

<p class="text-lg font-bold">条件分岐的には↓を見ているので、<strong>Hostの情報が抜け落ちていそう、、？</strong></p>

```dart{1}
if (state.uri.host.isNotEmpty) {
      await sync(context);
}
```

---
layout: center
---

## 念の為本当にHostが抜け落ちているのかをチェックする🔍

---
layout: default
---
## ディープリンク起動時のURL情報をログ出力


```dart{all|15}
@Riverpod(keepAlive: true, dependencies: [routeObserver, RemoteConfig])
GoRouter router(Ref ref) {
  return GoRouter(
    routes: $appRoutes,
    navigatorKey: _rootNavigatorKey,
    debugLogDiagnostics: kDebugMode,
    observers: [
      ref.read(routeObserverProvider),
    ],
    onException: (context, state, router) async {
      //...
    },
    initialLocation: _initialLocation,
    redirect: (context, state) async {
      debugPrint('redirect: ${state.uri.toString()}');
      //...
    },
  );
```

---
layout: default
---
## ディープリンク起動時のURL情報をログ出力

CLIからEmulatorのディープリンクを直接起動できるのでそれを利用

`/`の場合
```shell{all|1|4}{maxHeight: '450px', class:'!children:text-xs mt-8'}
❯ adb shell 'am start -W -a android.intent.action.VIEW -d "https://jobhouse.jobhouse-stg.th-svc.net/"'
LaunchState: COLD

08-18 16:14:30.581  2239  2239 I flutter : redirect: https://jobhouse.jobhouse-stg.th-svc.net/
```


`/`無しの場合
```shell{all|1|4}{maxHeight: '450px', class:'!children:text-xs mt-8'}
❯ adb shell 'am start -W -a android.intent.action.VIEW -d "https://jobhouse.jobhouse-stg.th-svc.net"'
LaunchState: COLD

08-18 16:14:10.282  1941  1941 I flutter : redirect: /? ←ここだけ、redirect: /?になっているぞ！！
```


<p class="text-2xl font-bold text-center" v-click> `/`無しのときだけ、hostの情報が消えているだと... </p>

---
layout: center
---

## ではどこで抜け落ちているのか、、、<br>分からないから観点を変えてみる


---
layout: center
---

## ディープリンクの情報(host/scheme...)が<br>どこまで来ているのかを調べる

---
layout: center
---
<div class='flex flex-row gap-6 mx-8'>
  <div class='flex-1 flex flex-col justify-center text-left'>
    <p class="text-2xl font-bold">
      (余談) FlutterアプリはOSごとのホストアプリ<span class="text-sm">※</span>のなかで、独自のFlutterエンジンを持つ形で動いている
    </p>
    <span class="text-sm">※Kotlin/Swiftのホストアプリだと思ってもらえればわかりやすい。(`libflutter.so`を動的ロードしている)</span>
    <p v-click class="font-bold text-xl">Dartのアプリケーション<span class="text-sm">※</span>は<br>このFlutterエンジンの上で動く<br><span class="text-sm font-normal">※AOTコンパイルされて`libapp.so`にまとめられる</span></p>
  </div>
  <div class='flex-1 flex justify-center mt-4'>
    <img src='/public/app-anatomy.svg' class='w-1/2'/>
  </div>
</div>


---
layout: center
---

## ホストアプリ（Kotlin）のレイヤーまではきているよね？

---
layout: default
---

<div class="mt-8">

```kotlin{all|6-9,18-21}{maxHeight: '500px', class:'!children:text-xs mt-8'}
// ...
class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        intent?.data?.let { uri ->
            Log.i(
                "DL",
                "onCreate dataString=${intent?.dataString} scheme=${uri.scheme} host=${uri.host} path=${uri.path} query=${uri.query}"
            )
        } ?: run {
            Log.i("DL", "onCreate dataString=null")
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val uri = intent.data
        Log.i(
            "DL",
            "onNewIntent dataString=${intent.dataString} scheme=${uri?.scheme} host=${uri?.host} path=${uri?.path} query=${uri?.query}"
        )
    }
}
```

</div>
<p class="text-2xl font-bold text-center">ログを埋め込んで、コールドスタート→ディープリンクを起動してみる</p>

---
layout: default
---

<div class="flex flex-row items-center justify-center mt-16">

```shell{all|10-13}{maxHeight: '500px', class:'!children:text-xs'}
❯ adb shell 'am start -W -a android.intent.action.VIEW -d "https://jobhouse.jobhouse-stg.th-svc.net"' 
Starting: Intent { act=android.intent.action.VIEW dat=https://jobhouse.jobhouse-stg.th-svc.net/... }
Status: ok
LaunchState: COLD
Activity: com.techouse.driverApp.stg/com.techouse.driver_app.MainActivity
TotalTime: 2563
WaitTime: 2565
Complete

08-18 16:06:50.979 32165 32165 I DL      
: onCreate dataString=https://jobhouse.jobhouse-stg.th-svc.net scheme=https host=jobhouse.jobhouse-stg.th-svc.net path= query=null
```

</div>

<p class="text-2xl font-bold text-center" v-click>host/schemeの情報はちゃんと来ていそうですね</p>

---
layout: center
---

## 大丈夫そう
<p class="text-2xl font-bold text-center" v-click>てことは、それより上のレイヤーでどこかしらで抜け落ちているのかも？</p>


---
layout: center
---

## ひとまずライブラリ/パッケージの中身を見てみる

性質的にFlutter Engineの問題ではないだろう...と信じてライブラリを疑う

闇雲に探すとキリがないんでね、、、（言い訳）

---
layout: center
---

<p class="text-3xl text-black"> ジョブハウスアプリはRoutingに<strong>GoRouter</strong>を利用</p>
<p v-click>ディープリンクのハンドリングもある程度そこに任せている</p>
<p class="text-2xl font-bold text-center" v-click>めちゃくちゃ怪しいですね...</p>


---
layout: center
---
# ということで

---
layout: center
---

<h1>Let’ fork!!</h1>

---
layout: image
image: fork_repo.png
---


---
layout: default
---

<div class="flex flex-row items-center justify-center mt-16">

```dart{all}{maxHeight: '450px', class:'!children:text-xs mt-8'}
class GoRouter implements RouterConfig<RouteMatchList> {
/// Default constructor to configure a GoRouter with a routes builder
  /// and an error page builder.
  ///
  /// The `routes` must not be null and must contain an [GoRouter] to match `/`.
  factory GoRouter({
    required List<RouteBase> routes,
    //...
  }) {
    return GoRouter.routingConfig(
      routingConfig: _ConstantRoutingConfig(
        RoutingConfig(
          routes: routes,
          //...
        ),
      ),
      //...
    );
  }
}
```

</div>

<p class="text-lg font-bold text-center" v-click>コールドスタート時の問題なので、初期化のコードが怪しいと踏む</p>

---
layout: default
---

<div class="flex flex-row items-center justify-center mt-16">

```dart{all|11}{maxHeight: '450px', class:'!children:text-xs mt-8'}
/// Creates a [GoRouter] with a dynamic [RoutingConfig].
  ///
  /// See [routing_config.dart](https://github.com/flutter/packages/blob/main/packages/go_router/example/lib/routing_config.dart).
  GoRouter.routingConfig({
    //...
  }) : _routingConfig = routingConfig {
    //...
    WidgetsFlutterBinding.ensureInitialized();

    routeInformationProvider = GoRouteInformationProvider(
      initialLocation: _effectiveInitialLocation(initialLocation), // ←すごい初期化のパスを決めていそうなやつがいる!!
      initialExtra: initialExtra,
      refreshListenable: refreshListenable,
      routerNeglect: routerNeglect,
    );
    //...
  }
```

</div>

<p class="text-lg font-bold text-center" v-click>ふむふむ、、`_effectiveInitialLocation`で初期化のパスを決めているのか</p>

---
layout: default
---

<div class="flex flex-row items-center justify-center mt-16">

```dart{all|6-11}{maxHeight: '450px', class:'!children:text-xs mt-8'}
String _effectiveInitialLocation(String? initialLocation) {
  //...
  Uri platformDefaultUri = Uri.parse(
    WidgetsBinding.instance.platformDispatcher.defaultRouteName,
  );
  if (platformDefaultUri.hasEmptyPath) {
    platformDefaultUri = Uri(
      path: '/',
      queryParameters: platformDefaultUri.queryParameters,
    );
  }
  final String platformDefault = platformDefaultUri.toString();
  if (initialLocation == null) {
    return platformDefault;
  } else if (platformDefault == '/') {
    return initialLocation;
  } else {
    return platformDefault;
  }
}
```

</div>

<p class="text-lg font-bold text-center" v-click>明らかに怪しいぞ、、`Uri`を初期化しているから、ホストの情報が抜け落ちちゃうよね</p>


---
layout: default
---

<div class="flex flex-row items-center justify-center mt-16">

```diff{all|9}{maxHeight: '450px', class:'!children:text-xs mt-8'}
@@ -575,10 +575,7 @@ class GoRouter implements RouterConfig<RouteMatchList> {
     if (platformDefaultUri.hasEmptyPath) {
       // TODO(chunhtai): Clean up this once `RouteInformation.uri` is available
       // in packages repo.
-      platformDefaultUri = Uri(
-        path: '/',
-        queryParameters: platformDefaultUri.queryParameters,
-      );
+      platformDefaultUri = platformDefaultUri.replace(path: '/');
     }
```

</div>

<p class="text-lg font-bold text-center" v-click>直す</p>


---
layout: default
---

<div class="flex flex-row items-center justify-center mt-16">

```diff{all|5-8}{maxHeight: '450px', class:'!children:text-xs mt-8'}
@@ -119,3 +119,7 @@ dev_dependencies:
flutter:
  generate: true
  uses-material-design: true
+
+dependency_overrides:
+  go_router:
+    path: ../forks/go_router-13.2.5
```

</div>

<p class="text-lg font-bold text-center">ローカルで修正したパッケージを当ててビルドしてみると、、、</p>


---
layout: center
---
# 直った！！🎉


---
layout: center
---
<p class="text-lg">余談というか推測）iOSの場合URIを渡す前に事前に正規化して、`/`を持たせるようにしているのだろう<br>(それがEngineのレイヤーなのか、Embedderのレイヤーなのかは分からないが)</p>

`/`つきだと`platformDefaultUri.hasEmptyPath`が`false`になる

```dart{all|3-5|6}{maxHeight: '450px', class:'!children:text-xs mt-8'}
String _effectiveInitialLocation(String? initialLocation) {
  //...
  Uri platformDefaultUri = Uri.parse(
    WidgetsBinding.instance.platformDispatcher.defaultRouteName,
  );
  if (platformDefaultUri.hasEmptyPath) {
    platformDefaultUri = Uri(
      path: '/',
      queryParameters: platformDefaultUri.queryParameters,
    );
  }
  //...
}
```

---
layout: center
---

## ではではPRを作ろう

---
layout: center
---

# Contribution Guideをまずはみる

リポジトリごとに若干違うので、ある程度目は通しておいた方がいい

---
layout: center
---

<div class='flex justify-center flex-col items-center' >
  <img src='/public/contribution_guide.png' class='w-1/2'/>
  <p>環境構築周りが書いてあったり、色々あるのでひとまずここからみるのが良い(今回はIssueが必須だった)</p>
</div>


---
layout: center
---

<div class='flex justify-center flex-col items-center' >
  <img src='/public/issue_desc_1.png' class='w-1/2'/>
  <p>Issueのdescriptionを書いて、Minimal Reproducible Example (MRE)も記述する</p>
</div>

---
layout: center
---

<div class='flex justify-center flex-col items-center' >
  <div class="flex flex-row">
    <img src='/public/issue_desc_2.png' class='w-1/2'/>
    <img src='/public/issue_desc_3.png' class='w-1/2'/>
  </div>
  <p>MREが結構大事できちんと書く</p>
</div>

---
layout: center
---

<div class='flex justify-center flex-col items-center' >
  <img src='/public/setup_tools.png' class='w-2/5'/>
  <p>開発環境を構築して、CI通るようにする</p>
  あるあるだが、Dart CLIでテスト周りのコマンドが自動化されている
</div>

---
layout: center
---

<div class='flex justify-center flex-col items-center' >
  <img src='/public/ci.png' class='w-1/3'/>
  <p>CIもたくさん</p>
</div>

---
layout: center
---

<div class='flex justify-center flex-col items-center' >
  <img src='/public/changelog.png' class='w-4/5'/>
  <p>CHANGELOGも自動化されている</p>
</div>

---
layout: center
---

諸々作業をして、
# PRとIssueをあげた！

---
layout: center
---

<div class='flex justify-center flex-col items-center' >
  <img src='/public/pr.png' class='w-3/5'/>
</div>


---
layout: center
---

<div class='flex justify-center flex-col items-center' >
  <img src='/public/cla.png' class='w-2/5'/>
  <p class="text-lg">余談）FlutterもGoogleのプロジェクトなので、Contributor Liscence Agreements(CLA)に署名が必要</p>
</div>

---
layout: center
---

# あとは気長に待つだけ

リポジトリの規模にもよるが、大抵結構かかるので2週間くらいは待っておいた方がいい

---
layout: center
---

<div class='flex justify-center flex-col items-center' >
  <img src='/public/approve1.png' class='w-4/5'/>
  <p class="text-2xl">Approve!</p>
</div>

---
layout: center
---

<div class='flex justify-center flex-col items-center' >
  <img src='/public/approve2.png' class='w-4/5'/>
  <p class="text-2xl">Approve!!</p>
</div>

---
layout: center
---

# 待つ...(2週間くらい)

---
layout: center
---

<div class='flex justify-center flex-col items-center' >
  <img src='/public/merge.png' class='w-4/5'/>
  <p class="text-2xl">Merge!!!</p>
</div>


---
layout: center
---

<div class='flex justify-center flex-col items-center' >
  <img src='/public/release_pr.png' class='w-3/5'/>
  <p class="text-2xl">Release!</p>
</div>

---
layout: center
---

<div class='flex justify-center flex-col items-center' >
  <img src='/public/go_router_changelog.png' class='w-3/5'/>
  <p class="text-2xl">Release!!!🎉</p>
</div>

---
layout: center
---

# 一連の流れを受けて

---
layout: center
---

<div>
  <p class='text-2xl font-bold' v-click>丁寧にやるのが大事</p>
  <ul class='list-disc inline-block text-lg text-left leading-relaxed ml-8' v-click>
    <li>原因を調べる</li>
    <li>最小の再現を作る</li>
    <li>直す</li>
    <li>丁寧にコミュニケーションを取る</li>
    <li>気長に待つ</li>
  </ul>
  <p class='text-xl' v-click>ライブラリだろうがなんだろうが直してやるぞという心持ちも大事</p>
  <p class='text-xl' v-click>それを書いたのも同じ人間ならいけるだろ...!!と強気で！</p>
  <p class="text-xl" v-click>そして<strong>敬意</strong>を持って！</p>
</div>

---
layout: center
---

<p class="text-xl" v-click>初期化時の重要なところにpatchを当てた</p>
<p class="text-xl" v-click>GoRouterはルーティングのデファクトスタンダード（公式だからね、weekly50万ダウンロード）</p>


<h2 v-click>自分の実装が<br>みんなのFlutterアプリの起動時に読み込まれるとなると<br>興奮しますね🤩</h2>


---
layout: center
---

# OSSは楽しいよ！！
