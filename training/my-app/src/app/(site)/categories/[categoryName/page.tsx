import Link from "next/link";
import { notFound } from "next/navigation";
import type { Category, Photo } from "@/type";
import { getPage } from "@/utils";
import styles from "./page.module.css";
import type { Metadata } from "next";

/**
 * getCategory（カテゴリ情報の取得）
 *
 * - `categoryName`（例：flower / animal）を受け取り、
 *   API（/api/categories/:categoryName）からカテゴリ情報を取得する。
 *
 * 重要：notFound() の使い所
 * - `notFound()` は「このルートは 404（Not Found）として扱うべき」という状態を Next.js に通知する関数。
 * - 単に `return null` するのではなく、notFound() を呼ぶことで
 *   App Router の not-found UI（not-found.tsx / NotFound コンポーネント）が表示される。
 *
 * アルゴリズム的な見方（取得→検証→失敗時分岐）：
 * 1. API にリクエスト
 * 2. HTTP ステータスを確認（res.ok）
 * 3. NG なら notFound() を発火し、ページ描画を 404 に切り替える
 * 4. OK なら JSON を parse して category を返す
 */
async function getCategory(categoryName: string) {
  /**
   * fetch + then チェーンでレスポンスを処理している。
   *
   * - res.ok は 200-299 の成功ステータスかどうか。
   * - 例えばカテゴリが存在しない場合、API が 404 を返す想定で、
   *   その場合に notFound() を呼ぶ。
   */
  const data: { category: Category } = await fetch(
    `http://localhost:8080/api/categories/${categoryName}`
  ).then((res) => {
    // ★: API が成功を返さなければ 404 扱いにする
    if (!res.ok) {
      /**
       * notFound() を呼ぶと、
       * - この関数の呼び出し元（Page / generateMetadata）に制御が戻るのではなく、
       * - Next.js の “Not Found フロー” に移行するイメージになる。
       *
       * 結果として「最も近い not-found 定義」がレンダリングされる。
       */
      notFound();
    }
    return res.json();
  });

  // API の JSON 形式が { category: ... } である前提で category のみ返す
  return data.category;
}

/**
 * getPhotos（写真一覧の取得）
 *
 * - API（/api/photos）から写真一覧を取得する。
 * - 現状は「全件」を取得してから画面側で categoryId によるフィルタをしている。
 *
 * notFound() の位置づけ：
 * - 写真一覧 API 自体が落ちている / 失敗している場合も、ここでは 404 として扱っている。
 * - 実運用では「500系のエラー画面（error.tsx）」にしたいケースもあるが、
 *   サンプルとして “取得できないなら Not Found” に寄せている、と解釈できる。
 */
async function getPhotos() {
  const data: { photos: Photo[] } = await fetch(
    "http://localhost:8080/api/photos"
  ).then((res) => {
    // ★: API が成功を返さなければ 404 扱いにする
    if (!res.ok) {
      notFound();
    }
    return res.json();
  });

  return data.photos;
}

/**
 * Props（App Router のページに渡される引数）
 *
 * - params: Dynamic Segment（/categories/[categoryName] の [categoryName] 部分）
 * - searchParams: URL のクエリ（?page=2 など）
 */
type Props = {
  params: { categoryName: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

/**
 * generateMetadata（動的メタデータ生成）
 *
 * - App Router では、ページやレイアウトで `generateMetadata` を export すると、
 *   リクエスト時にメタデータ（title など）を動的に組み立てられる。
 *
 * この実装がやっていること：
 * 1. params.categoryName からカテゴリ情報を取得する（getCategory）
 * 2. カテゴリ表示名（label）を使ってページタイトルを組み立てる
 *
 * アルゴリズム的な見方：
 * - 入力：URL の params
 * - 処理：データ取得（カテゴリ）
 * - 出力：Metadata（title）
 *
 * 注意：
 * - generateMetadata 内でも API 取得に失敗したら notFound() が呼ばれ、
 *   そのルートは 404 扱いになる（メタデータ生成の段階で弾ける）。
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategory(params.categoryName);
  return {
    title: `カテゴリー「${category.label}」の写真一覧`,
  };
}

/**
 * Page（カテゴリ別一覧ページ）
 *
 * 目的：
 * - 指定カテゴリの写真一覧を表示する
 * - URL クエリ `?page=` を使ってページ番号を扱い、前後ページのリンクを出す
 * - 不正/想定外の条件では notFound() により 404 を返す
 *
 * 全体アルゴリズム（入力→取得→検証→表示）：
 * 1. URL から params/searchParams を受け取る
 * 2. 必要データ（category / photos）を並列取得する（Promise.all）
 * 3. page を searchParams から正規化して取得する（getPage）
 * 4. page が許容範囲外なら notFound()（404）
 * 5. photos をカテゴリでフィルタし、UI に変換して表示する
 * 6. 前へ/次へリンクで URL を更新して遷移する
 */
export default async function Page({ params, searchParams }: Props) {
  // ★: Promise.all を使用した並列データ取得

  /**
   * Promise.all による並列データ取得
   *
   * - category 取得と photos 取得は依存関係が無いので同時に走らせるのが効率的。
   * - 待ち時間を「遅い方」に寄せられるため、逐次 await よりレイテンシが短くなりやすい。
   */
  const [category, photos] = await Promise.all([
    getCategory(params.categoryName),
    getPhotos(),
  ]);

  // 🚧: 本来であれば、カテゴリーに紐づく写真のみを取得しページネーションを施す

  /**
   * page（ページ番号）の取得と正規化
   *
   * - getPage(searchParams) は、searchParams.page の型揺れを吸収しつつ
   *   number（ページ番号）として返すユーティリティを想定。
   * - URL を状態として扱うため、ページ番号が URL に残り、共有・再訪・リロードに強い。
   */
  const page = getPage(searchParams);

  /**
   * ページ上限チェック（例：10ページまで）
   *
   * - ここではサンプルとして 11ページ以降を 404 扱いにしている。
   * - これにより、想定外の URL（/categories/xxx?page=9999）を “存在しないページ” として扱える。
   *
   * アルゴリズム的には：
   * - 入力：page
   * - 判定：page > 10 ?
   * - true → notFound() で終了（Not Found 画面へ）
   * - false → そのまま描画を続行
   */
  if (page > 10) {
    // 11ページ以降は404扱いにする
    notFound();
  }

  return (
    <div>
      {/**
       * ページ見出し
       *
       * - カテゴリの表示名（label）とページ番号を表示する。
       */}
      <h1>
        カテゴリー「{category.label}」の「{page}」ページ目
      </h1>

      {/**
       * 写真一覧
       *
       * - 現状は全 photos を取ってから filter している。
       * - filter → map は「集合から条件で抽出 → UI要素に射影」の典型パターン。
       *
       * アルゴリズム：
       * 1. photos の中から categoryId === category.id のものだけ残す
       * 2. 残った写真を <li> に変換し、詳細リンクを付ける
       */}
      <ul>
        {photos
          .filter((photo) => photo.categoryId === category.id)
          .map((photo) => (
            <li key={photo.id}>
              {/**
               * 写真詳細へのリンク
               *
               * - `/photos/${photo.id}` は写真詳細ページ（Dynamic Route）を想定。
               * - Link により、可能ならクライアントサイド遷移が使われる。
               */}
              <Link href={`/photos/${photo.id}`}>{photo.title}</Link>
            </li>
          ))}
      </ul>

      {/**
       * ページネーション
       *
       * - 前へ：page !== 1 のときのみ表示（1ページ目は戻れない）
       * - 次へ：常に表示（本来はデータ件数等で制御するのが理想）
       *
       * アルゴリズム：
       * - prev: page-1 を URL クエリに反映して遷移
       * - next: page+1 を URL クエリに反映して遷移
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