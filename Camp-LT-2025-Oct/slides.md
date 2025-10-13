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

# 今日はね

---
layout: center
---

# OSSはいいぞという話をします


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
<p v-click>いつもありがとうございます、、、</p>


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
      (余談) FlutterアプリはOSごとのホストアプリ※のなかで、独自のFlutterエンジンを持つ形で動いている
    </p>
    <span class="text-sm">※Kotlin/Swiftのホストアプリだと思ってもらえればわかりやすい</span>
    <p v-click class="font-bold text-xl">DartのアプリケーションはこのFlutterエンジンの上で動く</p>
  </div>
  <div class='flex-1 flex justify-center mt-4'>
    <img src='/app-anatomy.svg' class='w-1/2'/>
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
❯ adb shell 'am start -W -a android.intent.action.VIEW -d "https://jobhouse.jobhouse-stg.th-svc.net/"'
Starting: Intent { act=android.intent.action.VIEW dat=https://jobhouse.jobhouse-stg.th-svc.net/... }
Status: ok
LaunchState: WARM
Activity: com.techouse.driverApp.stg/com.techouse.driver_app.MainActivity
TotalTime: 2153
WaitTime: 2157
Complete

08-18 16:07:29.577 32421 32421 I DL      
: onCreate dataString=https://jobhouse.jobhouse-stg.th-svc.net/ \
scheme=https host=jobhouse.jobhouse-stg.th-svc.net path=/ query=null
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

<p class="text-3xl text-black"> ジョブハウスアプリはRoutingに<strong>GoRouter</strong>を利用しており、<br>ディープリンクのハンドリングもある程度そこに任せている</p>
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

<p class="text-lg font-bold text-center">コールドスタート時の問題なので、初期化のコードが怪しいと踏む</p>

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

<p class="text-lg font-bold text-center">ふむふむ、、</p>

---
layout: default
---

<div class="flex flex-row items-center justify-center mt-16">

```dart{all|18-20}{maxHeight: '450px', class:'!children:text-xs mt-8'}
xxx
```

</div>

<p class="text-lg font-bold text-center">明らかに怪しいぞ、、、ここで初期化しているっぽい</p>


---
layout: default
---

<div class="flex flex-row items-center justify-center mt-16">

```dart{all|18-20}{maxHeight: '450px', class:'!children:text-xs mt-8'}
xxx
```

</div>

<p class="text-lg font-bold text-center">直してみて</p>
