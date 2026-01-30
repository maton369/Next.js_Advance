import { notFound } from "next/navigation";
import { SITE_NAME } from "@/constants";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPhotos } from "@/services/getPhotos";
import { MyProfilePanel } from "./_components/MyProfilePanel";
import { MyProfilePhotos } from "./_components/MyProfilePhotos";
import type { Metadata } from "next";

/**
 * Props（ページコンポーネントに渡される props の型）
 *
 * - App Router の page.tsx では、URL のクエリ（?page=... 等）が `searchParams` として渡される。
 * - 値は
 *   - string（?page=1 のように単一）
 *   - string[]（同じキーが複数回現れた場合：?page=1&page=2）
 *   - undefined（未指定）
 *   になり得るため、この型になっている。
 *
 * アルゴリズム的には：
 * - 「URL クエリ文字列」→「型の揺れを含む辞書データ」へデコードされた入力が searchParams。
 */
type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

/**
 * generateMetadata（動的メタデータ生成）
 *
 * - App Router では `export async function generateMetadata()` を定義すると、
 *   リクエストごとにメタデータ（title/description など）を動的に生成できる。
 *
 * この実装の特徴：
 * - タイトルに “ログイン中のユーザー名” を含めているため、メタデータがユーザー依存（動的）になる。
 *
 * アルゴリズム的な見方（認証チェック → メタデータ構築）：
 * 1. サーバ側でセッションを取得（getServerSession）
 * 2. 未ログインなら notFound()（= このページは閲覧不可として 404 へ）
 * 3. ログインユーザー名を使って title を組み立てて返す
 *
 * 注意：
 * - 認証に依存しているため、この generateMetadata も “動的レンダリング” に寄りやすい。
 * - ページ本体と同様に getServerSession が走るので、同一リクエスト内の重複実行を抑えるなら
 *   getServerSession を cache 化する設計が候補になる（既に別途検討している文脈がある）。
 */
export async function generateMetadata(): Promise<Metadata> {
  /**
   * セッション取得
   *
   * - NextAuth のセッションをサーバ側で取得し、
   *   “現在のリクエストが誰のものか” を判定する。
   */
  const session = await getServerSession();

  /**
   * 未ログイン（またはセッション無し）なら notFound()
   *
   * - このページは “マイページ” であり、ログインしていないユーザーに見せる意味が無い。
   * - ここでは notFound() を使って 404 として扱っている。
   *
   * アルゴリズム的には：
   * - “アクセス制御（認証ゲート）” をメタデータ生成段階でもかけている。
   */
  if (!session) {
    notFound();
  }

  /**
   * title を動的に構築して返す
   *
   * - session.user.name を使って「○○さんのマイページ | SITE_NAME」という形式にしている。
   * - これにより、ブラウザのタブ名や検索結果のタイトルがユーザーに合わせて変化する。
   */
  return { title: `${session.user.name}さんのマイページ | ${SITE_NAME}` };
}

/**
 * Page（/profile のページ本体）
 *
 * - Server Component として動作する（"use client" が無い）。
 * - 認証チェック、ページ番号の決定、プロフィール確保、投稿一覧取得を行い、
 *   UI コンポーネントへデータを渡す。
 *
 * アルゴリズム的な見方（認証→入力正規化→DB整合→一覧取得→描画）：
 * 【1】セッション取得でログイン判定（認可）
 * 【2】searchParams から page を取り出し正規化（入力の整形）
 * 【3】profile を upsert で確保（DB の整合性維持）
 * 【4】authorId を使って投稿写真を取得（データ取得）
 * 【5】取得結果を UI に投影（表示）
 */
export default async function Page({ searchParams }: Props) {
  /**
   * 【1】ログインユーザーからのリクエストであるかをチェック
   *
   * - getServerSession により、現在のリクエストが認証済みか判定する。
   * - session.user が無い場合も想定し、両方をチェックしている。
   *
   * アルゴリズム的には：
   * - “この処理の前提条件（ログイン済み）” を満たしているかを検証するガード節。
   */
  const session = await getServerSession();
  if (!session || !session.user) {
    notFound();
  }

  /**
   * 【2】ページネーション向けに、ページ番号を特定
   *
   * - searchParams.page は string | string[] | undefined の可能性がある。
   * - ここでは string のときだけ採用し、それ以外は "1" をデフォルトにする。
   *
   * アルゴリズム的には：
   * - “入力（クエリ）” を “内部表現（ページ番号文字列）” に正規化するステップ。
   *
   * 注意（要件次第で改善余地）：
   * - page は本来 number として扱い、数値変換 + 範囲チェック（1以上）を行うと堅牢になる。
   */
  const page = typeof searchParams.page === "string" ? searchParams.page : "1";

  /**
   * 【3】ログインユーザーIDを参照し、プロフィール情報を取得（無ければ作成）
   *
   * prisma.profile.upsert の意味：
   * - where 条件（userId）でレコードが存在すれば update を実行
   * - 存在しなければ create を実行
   *
   * ここで update: {} としている意図：
   * - “プロフィールが無いユーザー” の初回アクセス時に空プロフィールを自動生成したい
   * - 既にある場合は特に更新しない（noop）でそのまま返したい
   *
   * アルゴリズム的には：
   * - “ユーザーID → Profile を一意に確保する”
   * - つまり「Profile が存在する」という不変条件（invariant）をこの時点で成立させる処理。
   *
   * この不変条件を作るメリット：
   * - 下流の UI（MyProfilePanel 等）が profile の存在を前提に書ける
   * - null チェックが減り、表示ロジックが単純になる
   */
  const profile = await prisma.profile.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  });

  /**
   * 【4】ログインユーザーの投稿写真一覧を取得
   *
   * getPhotos へ渡しているパラメータ：
   * - page: ページ番号（文字列のまま渡している）
   * - take: 1ページあたりの件数（ここでは "15"）
   * - authorId: ログインユーザーID（= 自分の投稿に絞るフィルタ）
   *
   * 戻り値：
   * - photos: 表示する写真配列
   * - pagination: ページネーション情報（総件数/次ページ有無などが想定される）
   *
   * アルゴリズム的には：
   * - “authorId + page + take” を入力として、
   *   “その条件に該当する部分集合（ページ分割された一覧）” を取得するステップ。
   */
  const { photos, pagination } = await getPhotos({
    page,
    take: "15",
    authorId: session.user.id,
  });

  return (
    <>
      {/**
       * MyProfilePanel（上部プロフィール表示）
       *
       * - session.user（認証済みユーザーの基本情報）
       * - profile（DB上のプロフィール情報）
       * を渡して表示する。
       *
       * アルゴリズム的には：
       * - “取得した状態” を “表示用のコンポーネント” へ投影する工程。
       */}
      <MyProfilePanel user={session.user} profile={profile} />

      {/**
       * MyProfilePhotos（投稿写真一覧 + ページネーション）
       *
       * - photos: 一覧表示のデータ
       * - pagination: ページングUIを組むための情報
       * - page: 現在ページ（ここでは文字列）
       *
       * アルゴリズム的には：
       * - “ページング済みの部分集合” を UI としてレンダリングする工程。
       */}
      <MyProfilePhotos photos={photos} pagination={pagination} page={page} />
    </>
  );
}