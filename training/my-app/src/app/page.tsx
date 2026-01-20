import Link from "next/link";
import type { Photo } from "@/type";
import styles from "./page.module.css";

/**
 * getPhotos（写真一覧の取得関数）
 *
 * - トップ画面で表示する「写真の一覧」を API から取得するための関数。
 * - `async function` にしておくことで、ページ側で `await getPhotos()` と書ける。
 *
 * App Router での重要ポイント：
 * - このファイル（おそらく `app/page.tsx`）は `"use client"` が無いので Server Component である。
 * - Server Component では `fetch` をサーバ側で実行できるため、
 *   ブラウザから直接 API を叩くのではなく、サーバでデータを取りに行ってから HTML を生成できる。
 *
 * 追加要件：cache: "no-store"
 * - Next.js の fetch は（環境/設定にもよるが）キャッシュや再利用が効くことがある。
 * - `cache: "no-store"` を指定すると「このリクエスト結果をキャッシュせず、毎回必ず取りに行く」
 *   という動きになる。
 * - “最新の一覧を常に表示したい” という用途では no-store が分かりやすい選択になる。
 *
 * アルゴリズム的な見方（データ取得→整形→表示）：
 * 1. API へリクエスト（no-store により毎回実行）
 * 2. JSON を受け取る
 * 3. 必要なプロパティだけに整形（id, title）
 * 4. UI（リスト）に変換して描画する
 */
async function getPhotos() {
  /**
   * API リクエスト
   *
   * - fetch("http://localhost:8080/api/photos") でバックエンドAPIからデータを取得している。
   * - `.then((res) => res.json())` でレスポンスボディを JSON としてパースしている。
   *
   * cache: "no-store" の意味：
   * - ブラウザの fetch における “キャッシュ制御” に近い概念だが、Next.js ではサーバ側 fetch にも影響する。
   * - これにより、同じリクエストが繰り返されても「前回結果を再利用」せずに毎回取得する方向になる。
   *
   * 型注釈：
   * - `data: { photos: Photo[] }` としているので、
   *   受け取る JSON は `{ photos: [...] }` の形である前提になっている。
   *
   * 注意（運用面）：
   * - "http://localhost:8080" は開発環境では便利だが、本番では環境変数化（例：process.env.API_URL）するのが一般的。
   * - fetch は失敗（ネットワークエラー / 非200）し得るため、本来は例外処理や res.ok の確認も考慮対象。
   */
  const data: { photos: Photo[] } = await fetch(
    "http://localhost:8080/api/photos",
    {
      // ★: キャッシュしない（常に最新データを取りに行く）
      cache: "no-store",
    }
  ).then((res) => res.json());

  /**
   * 必要なフィールドだけを抽出して返す
   *
   * - `Photo` 型には id/title 以外の情報（例：url, createdAt 等）が含まれている可能性があるが、
   *   この画面（トップ一覧）で必要なのは「詳細ページへ行くための id」と「表示用 title」だけ。
   *
   * - そこで `map(({ id, title }) => ({ id, title }))` により最小限のデータに整形している。
   *
   * アルゴリズム的には「データ圧縮・投影（projection）」であり、
   * - 表示に不要な情報を落とす
   * - UIに必要な形に揃える
   * という役割を持つ。
   */
  return data.photos.map(({ id, title }) => ({ id, title }));
}

/**
 * Page（トップ画面）
 *
 * - App Router では、`page.tsx` の default export がルートのページとして扱われる。
 * - この関数が `async` になっているのが重要で、Server Component であれば
 *   「ページのレンダリング前に await でデータ取得」を自然に書ける。
 *
 * アルゴリズム的な見方（SSR/Server Component の流れ）：
 * 1. リクエストが来る
 * 2. Page 関数がサーバで実行される
 * 3. `await getPhotos()` でデータを取得する（no-store のため毎回 API へ）
 * 4. 取得したデータを元に JSX を構築し、HTML を生成して返す
 *
 * これにより、クライアント側でデータ取得してから描画するよりも
 * - 初期表示が速く感じやすい
 * - SEO 的にも有利になりやすい
 * という利点がある（要件次第）。
 */
export default async function Page() {
  /**
   * 写真一覧の取得
   *
   * - getPhotos は API を叩いて photos を返す。
   * - ここで await しているため、この時点で photos は配列として確定している。
   *
   * ※ Server Component のため、この fetch はブラウザではなくサーバで実行される前提。
   */
  const photos = await getPhotos(); // <- データを取得

  return (
    /**
     * styles.container（CSS Modules）
     *
     * - `page.module.css` でトップページ専用のスタイルを定義し、ここで適用している。
     * - ページ固有の余白、最大幅、背景などを閉じ込めて管理できる。
     */
    <div className={styles.container}>
      <h1>トップ画面</h1>

      {/**
       * 写真タイトル一覧の表示
       *
       * - photos 配列を map し、<li> のリストに変換する。
       * - React ではリスト表示に key が必要なので、photo の id を key にしている。
       *
       * アルゴリズム的には：
       * - データ（photos） → UI要素列（<li>...）への変換処理
       */}
      <ul>
        {photos.map(({ id, title }) => (
          <li key={id}>
            {/**
             * 詳細ページへのリンク
             *
             * - `/photos/${id}` は Dynamic Route（例：`app/photos/[id]/page.tsx`）を想定したURL。
             * - Next.js の <Link> を使うことで、可能であればクライアントサイド遷移になり、
             *   画面遷移が滑らかになる。
             *
             * アルゴリズム的には：
             * - ユーザーがクリック
             * - ルーターが href を解決（id をパスに埋め込む）
             * - 必要なページを読み込み、差分更新で表示を切り替える
             */}
            <Link href={`/photos/${id}`}>{title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}