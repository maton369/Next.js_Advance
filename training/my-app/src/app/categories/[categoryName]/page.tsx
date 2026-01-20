import Link from "next/link";
import type { Category, Photo } from "@/type";
import { getPage } from "@/utils";
import styles from "./page.module.css";

/**
 * getCategory（カテゴリ情報を取得する関数）
 *
 * - Dynamic Segment で渡ってくる `categoryName`（例：flower / animal）を使って、
 *   カテゴリ詳細（id, label など）を API から取得する。
 *
 * App Router 的ポイント：
 * - このページ（おそらく `app/categories/[categoryName]/page.tsx`）は `"use client"` が無いので Server Component。
 * - よって、この fetch はブラウザではなくサーバ側で実行される前提であり、
 *   「データを取ってから HTML を作る」という流れを自然に書ける。
 *
 * アルゴリズム的な見方：
 * 1. 入力：categoryName（URL 由来のパラメータ）
 * 2. API へ GET /api/categories/:categoryName
 * 3. JSON をパース
 * 4. category オブジェクトを返す
 */
async function getCategory(categoryName: string) {
  /**
   * - API は `{ category: Category }` の形で返ってくる前提。
   * - 受け取った JSON から category のみを取り出して返す。
   *
   * 注意（運用面）：
   * - localhost 固定は開発向けなので、本番では環境変数にするのが一般的。
   * - res.ok のチェックや try/catch での例外処理が無いので、失敗時の画面設計（notFound 等）を
   *   将来的に追加すると堅牢になる。
   */
  const data: { category: Category } = await fetch(
    `http://localhost:8080/api/categories/${categoryName}`
  ).then((res) => res.json());

  return data.category;
}

/**
 * getPhotos（写真一覧を取得する関数）
 *
 * - 全写真を API から取得する。
 * - このサンプルでは、後段で `categoryId` によるフィルタを行い、カテゴリに紐づく写真だけを抽出している。
 *
 * アルゴリズム的な見方：
 * 1. API へ GET /api/photos
 * 2. JSON をパース
 * 3. photos 配列を返す
 *
 * 🚧: 本番的には「カテゴリで絞り込んだ写真」や「ページネーションされた写真」だけを
 *     API から取る方が効率が良い（不要な全件取得を避けられる）。
 */
async function getPhotos() {
  const data: { photos: Photo[] } = await fetch(
    "http://localhost:8080/api/photos"
  ).then((res) => res.json());
  return data.photos;
}

/**
 * Props（App Router のページに渡される引数）
 *
 * - params: Dynamic Segment（/categories/[categoryName] の [categoryName] 部分）
 * - searchParams: URL のクエリ（?page=2 など）
 *
 * 例：
 * - /categories/flower?page=3
 *   params.categoryName === "flower"
 *   searchParams.page === "3"
 */
type Props = {
  params: { categoryName: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

/**
 * カテゴリ別一覧ページ（/categories/[categoryName]）
 *
 * - 目的：指定カテゴリの写真一覧を表示し、ページ番号（?page=）に応じてページネーションUIを出す。
 *
 * アルゴリズム的な見方（入力→データ取得→整形→表示→遷移）：
 * 1. URL から params.categoryName（カテゴリ指定）を受け取る
 * 2. URL から searchParams（ページ番号など）を受け取る
 * 3. 必要なデータ（カテゴリ情報、写真一覧）を取得する
 * 4. 表示対象を抽出（categoryId でフィルタ）
 * 5. 画面表示（タイトル・一覧・ページネーション）
 * 6. Link で前後ページへ遷移（URL の page を更新）
 */
export default async function Page({ params, searchParams }: Props) {
  // ★: Promise.all を使用した並列データ取得

  /**
   * Promise.all による並列取得
   *
   * - getCategory と getPhotos は互いに依存しないため、逐次実行すると待ち時間が増える。
   * - Promise.all で同時に走らせることで、全体の待ち時間は「遅い方」に近づき、
   *   レイテンシが短縮される（サーバレンダリングでも効く最適化）。
   *
   * アルゴリズム：
   * - 2つの非同期処理を同時に開始
   * - 両方完了した時点で [category, photos] に結果をまとめて受け取る
   */
  const [category, photos] = await Promise.all([
    getCategory(params.categoryName),
    getPhotos(),
  ]);

  // 🚧: 本来であれば、カテゴリーに紐づく写真のみを取得しページネーションを施す

  /**
   * page（ページ番号）の取得
   *
   * - `getPage(searchParams)` は、searchParams から page を取り出して
   *   1以上の整数に正規化するようなユーティリティを想定。
   *
   * ここで “URL を状態として扱う” ことの意味：
   * - どのページを見ているかが URL に載るので、共有/再訪/リロードに強い。
   */
  const page = getPage(searchParams);

  return (
    <div>
      {/**
       * 表示タイトル
       *
       * - category.label は「人間向けの表示名」を想定（例："花"）。
       * - page は URL 由来の現在のページ番号。
       */}
      <h1>
        カテゴリー「{category.label}」の「{page}」ページ目
      </h1>

      {/**
       * 写真一覧表示
       *
       * - 現状は全 photos を取ってから、categoryId でフィルタしている。
       * - filter → map の流れは「データ集合の絞り込み → UI要素への射影（変換）」という典型パターン。
       *
       * アルゴリズム：
       * 1. photos の中から photo.categoryId === category.id のものだけ残す
       * 2. 残った要素を <li> に変換し、詳細リンクを付けて表示する
       *
       * 🚧: 本来は API 側で categoryId や page/limit を受けて、必要分だけ返すのが効率的。
       */
      <ul>
        {photos
          .filter((photo) => photo.categoryId === category.id)
          .map((photo) => (
            <li key={photo.id}>
              {/**
               * 写真詳細へのリンク
               *
               * - `/photos/${photo.id}` は `app/photos/[id]/page.tsx` のような Dynamic Route を想定。
               * - Link を使うことで、可能であればクライアントサイド遷移になり、体感が良くなりやすい。
               */}
              <Link href={`/photos/${photo.id}`}>{photo.title}</Link>
            </li>
          ))}
      </ul>

      {/**
       * ページネーションUI
       *
       * - page に応じて「前へ」を出し分ける（1ページ目なら前へを出さない）。
       * - 「次へ」は常に出している（本来は総ページ数やデータ件数に応じて制御するのが理想）。
       *
       * アルゴリズム：
       * - 前へ：page !== 1 のときのみ表示、URL の page を page-1 にして遷移
       * - 次へ：URL の page を page+1 にして遷移
       *
       * ここでも “URL を状態として扱う” のがポイントで、
       * - 遷移 = URL の更新
       * - 表示状態 = URL から復元
       という設計が一貫している。
       */}
      <ul className={styles.pagination}>
        {page !== 1 && (
          <li>
            <Link href={`/categories/${params.categoryName}?page=${page - 1}`}>
              前へ
            </Link>
          </li>
        )}
        <li>
          <Link href={`/categories/${params.categoryName}?page=${page + 1}`}>
            次へ
          </Link>
        </li>
      </ul>
    </div>
  );
}