import Link from "next/link";
import type { Category, Photo } from "@/type";
import { LikeButton } from "./LikeButton";
import styles from "./page.module.css";
import type { Metadata } from "next";

/**
 * getPhoto（写真詳細を取得する関数）
 *
 * - Dynamic Segment で渡ってくる `photoId`（例：/photos/123 の "123"）を受け取り、
 *   API（/api/photos/:photoId）から写真詳細を取得する。
 *
 * App Router 的ポイント：
 * - このページファイルは `"use client"` が無いので、基本的に Server Component として動く。
 * - よって `fetch` はサーバ側で実行され、「データを取得してから HTML を生成」できる。
 *
 * アルゴリズム的な見方（入力→取得→出力）：
 * 1. 入力：photoId（URL 由来）
 * 2. API へリクエスト
 * 3. JSON をパース
 * 4. photo オブジェクトを返す
 */
async function getPhoto(photoId: string) {
  /**
   * - API が `{ photo: Photo }` の形で返す前提で data.photo を取り出す。
   *
   * 注意（運用面）：
   * - res.ok の確認が無いので、404/500 の場合に例外や不正値になる可能性がある。
   *   将来的に notFound() を組み合わせると「存在しない photoId を 404 表示」にできる。
   */
  const data: { photo: Photo } = await fetch(
    `http://localhost:8080/api/photos/${photoId}`,
  ).then((res) => res.json());

  return data.photo;
}

/**
 * getCategory（カテゴリ詳細を取得する関数）
 *
 * - 写真データが持つ `categoryId` を受け取り、
 *   API（/api/categories/id/:categoryId）からカテゴリ情報を取得する。
 *
 * ここで “name” と “label” の使い分けが示唆されている：
 * - category.name：URL に載せる識別子（例：flower）
 * - category.label：画面に表示する人間向け名称（例：花）
 *
 * アルゴリズム的な見方：
 * 1. 入力：categoryId（photo から派生）
 * 2. API へリクエスト
 * 3. JSON をパース
 * 4. category オブジェクトを返す
 */
async function getCategory(categoryId: string) {
  const data: { category: Category } = await fetch(
    `http://localhost:8080/api/categories/id/${categoryId}`,
  ).then((res) => res.json());

  return data.category;
}

/**
 * Props（App Router のページに渡される引数）
 *
 * - params.photoId は Dynamic Segment（例：`app/photos/[photoId]/page.tsx`）由来。
 * - /photos/123 にアクセスすると params.photoId === "123" となる。
 */
type Props = {
  params: { photoId: string };
};

/**
 * generateMetadata（写真詳細ページの動的メタデータ生成）
 *
 * - 写真ごとに title/description を変えたいので、静的 metadata ではなく generateMetadata を使っている。
 * - ここでは photo を取得し、その `title` と `description` を metadata に反映する。
 *
 * アルゴリズム的な見方（入力→データ取得→メタ生成）：
 * 1. 入力：params.photoId
 * 2. getPhoto(photoId) で写真データを取得
 * 3. title/description を metadata として返す
 *
 * 注意：
 * - generateMetadata もデータ取得を行うため、ここでの fetch 失敗時の扱い（404/エラーUI）は要設計。
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const photo = await getPhoto(params.photoId);

  return {
    /**
     * title：ブラウザタブなどに表示される
     * - 写真タイトルをそのまま使うことで「どの写真の詳細か」が分かりやすい。
     */
    title: photo.title,

    /**
     * description：検索エンジンやSNSプレビューに参照されることがある
     * - 写真の説明文を採用して、ページの内容を説明する。
     */
    description: photo.description,
  };
}

/**
 * Page（写真詳細ページ本体）
 *
 * 目的：
 * - 指定 photoId の写真詳細（概要、カテゴリ）を表示する
 * - いいねボタン（Client Component）を提供する
 *
 * 全体アルゴリズム（入力→取得→結合→表示）：
 * 1. URL から params.photoId を受け取る
 * 2. photoId を使って写真データを取得する（getPhoto）
 * 3. photo.categoryId を使ってカテゴリデータを取得する（getCategory）
 * 4. 取得したデータを UI（table / Link / LikeButton）へ射影して表示する
 */
export default async function Page({ params }: Props) {
  /**
   * 写真データ取得
   *
   * - params.photoId から写真を取得する。
   * - 取得結果 photo には categoryId など、次の取得に必要な情報が含まれている。
   */
  const photo = await getPhoto(params.photoId);

  /**
   * カテゴリデータ取得（photo に依存）
   *
   * - ここは photo.categoryId が分かってからでないと取得できないため、
   *   Promise.all のような並列取得にはできない（依存関係がある）。
   *
   * アルゴリズム的には “2段階取得（dependent fetch）”：
   * - 第1段階：photo を取得
   * - 第2段階：photo から得た categoryId を使って category を取得
   */
  const category = await getCategory(photo.categoryId);

  return (
    <div>
      {/**
       * 見出し
       *
       * - 文言は「写真ID」になっているが、表示しているのは photo.title なので、
       *   実際には「写真『タイトル』の詳細画面」のような意味合いになっている。
       * - ID を表示したいなら params.photoId を出す、タイトルを表示したいなら文言を合わせる、などが改善候補。
       */}
      <h1>写真ID「{photo.title}」の詳細画面</h1>

      {/**
       * 詳細情報テーブル
       *
       * - CSS Modules の styles.table を適用し、見た目（罫線、余白等）を整える。
       * - <tbody> 内に <tr> を並べて、項目名（th）と値（td）を表示する。
       */}
      <table className={styles.table}>
        <tbody>
          <tr>
            <th>概要</th>
            <td>{photo.description}</td>
          </tr>

          <tr>
            <th>カテゴリー</th>
            <td>
              {/**
               * カテゴリページへのリンク
               *
               * - URL は `/categories/${category.name}` を使っている。
               *   これはカテゴリページが name（例：flower）でルーティングされる設計を想定している。
               * - 表示は category.label（例：花）で、人間向けの名称を出している。
               *
               * アルゴリズム的には：
               * - “内部識別子（name）” を URL に埋め込み
               * - “表示名（label）” を UI に出す
               * という責務分離になっている。
               */}
              <Link href={`/categories/${category.name}`}>{category.label}</Link>
            </td>
          </tr>
        </tbody>
      </table>

      {/**
       * LikeButton（いいねボタン）
       *
       * - LikeButton は onClick 等のイベントを持つため、通常 Client Component（"use client"）として実装される。
       * - このページ（Server Component）から Client Component を import して配置することで、
       *   “データ表示はサーバで” “操作はクライアントで” という分業が成立する。
       *
       * アルゴリズム的には：
       * - サーバで photo/category を取得し HTML を生成
       * - クライアントで LikeButton が水和され、クリックイベントが有効化される
       * - ユーザー操作により「いいね処理」が走る
       */}
      <LikeButton photoId={params.photoId} />
    </div>
  );
}