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

<div v-click>
  <h2>QA（Kさん）からバグ報告が！！</h2>
  <img src='/public/qa_report.png' class='w-1/2'/>
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
  URLをクリックで対応するアプリのViewに遷移させることができる
</p>
<p>
  アプリの実装で、遷移するリンクに応じて処理を切り替えたりも可能
</p>

TODO: 図を貼る

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
  <div class='flex-1 flex justify-center mt-4'>
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
### 1.Androidのディープリンク定義ファイル(xml定義)
### 2.アプリケーションのRouting定義（routes.rbみたいなもの）

---
layout: center
---

# 地道に調査...
ドキュメント読んだり、ログを埋め込んだり

---
layout: default
---

```dart{all|18-20}{maxHeight: '450px', class:'!children:text-xs mt-8'}
// ジョブハウスのアプリケーションコード
class HorizontalArticleSearchRoute extends GoRouteData
    with HorizontalNamespaceMixin {
  static const _name = 'article_search';
  static const _path = 'article_search_boxes';

  static final $parentNavigatorKey = _rootNavigatorKey;

  const HorizontalArticleSearchRoute();

  @override
  Page<void> buildPage(BuildContext context, GoRouterState state) {
    //...
  }

  @override
  FutureOr<String?> redirect(BuildContext context, GoRouterState state) async {
    // Set the namespace to the shared namespace if it is opened from the deep linking.
    if (state.uri.host.isNotEmpty) {
      await sync(context);
    }
    return null;
  }
}
```

<p class="text-lg font-bold">わかった！！androidの時だけ、検索条件更新のためのsyncが呼ばれていない</p>

---
layout: center
---

# でもなんでだ、、、

条件分岐的には↓を見ているので、Hostの情報が抜け落ちていそう、、？

```dart{1}
if (state.uri.host.isNotEmpty) {
      await sync(context);
}
```

---
layout: center
---

# 分からないから観点を変えてみる


---
layout: center
---

## どこまでディープリンクの情報(host/scheme...)が<br>来ているのかを調べる

---
layout: center
---
<div class='flex flex-row gap-6 mx-8'>
  <div class='flex-1 flex flex-col justify-center text-left'>
    <p class="text-2xl font-bold">
      (余談) FlutterアプリはOSごとのホストアプリ（Platform Specific※）のなかで、独自のFlutterエンジンを持つ形で動いている <span class="text-sm">※Kotlin/Swiftだと思ってもらえればわかりやすい</span>
    </p>
    <p v-click class="font-bold text-xl">DartのアプリケーションはこのFlutterエンジンの上で動く</p>
  </div>
  <div class='flex-1 flex justify-center mt-4'>
    <img src='/public/app-anatomy.svg' class='w-1/2'/>
  </div>
</div>


---
layout: center
---

## ホスト（Platform/Kotlin）のレイヤーまではきているよね？

---
layout: default
---

```kotlin{all}{maxHeight: '500px', class:'!children:text-xs mt-8'}
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
<p class="text-lg font-bold text-center">ログを埋め込んで、コールドスタート→ディープリンクを起動してみる</p>

---
layout: default
---

```shell{all|11-13}{maxHeight: '500px', class:'!children:text-xs mt-8'}
adb logcat -s DL:I
❯ adb shell 'am start -W -a android.intent.action.VIEW -d "https://jobhouse.jobhouse-stg.th-svc.net/"'
Starting: Intent { act=android.intent.action.VIEW dat=https://jobhouse.jobhouse-stg.th-svc.net/... }
Status: ok
LaunchState: COLD
Activity: com.techouse.driverApp.stg/com.techouse.driver_app.MainActivity
TotalTime: 2264
WaitTime: 2268
Complete

08-18 15:34:19.307 25522 25522 I DL      \
: onCreate dataString=https://jobhouse.jobhouse-stg.th-svc.net/ \
scheme=https host=jobhouse.jobhouse-stg.th-svc.net path=/ query=null
```

<p class="text-lg font-bold text-center">host/schemeの情報はちゃんと来ていそうですね</p>

---
layout: center
---

## 大丈夫そう

---
layout: center
---

## 次に手をつけやすそうなところでいくと、<br>ライブラリ/パッケージの中身を見てみる

