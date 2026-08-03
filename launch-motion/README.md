# 校時レイヤー ローンチ動画（無音）

既存のChrome拡張「校時レイヤー」を紹介するRemotion試作です。

## 実行

```bash
npm install
npm run studio
```

Studioで確認したあと、MP4を書き出すには次を実行します。

```bash
npm run render
```

静止画の確認には次を使います。

```bash
npm run render:still
```

出力先は `out/` です。音声トラックは実装していません。
