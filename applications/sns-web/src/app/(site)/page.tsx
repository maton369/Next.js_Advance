import { profiles, users } from "@/_mock";
import { SITE_NAME } from "@/constants";
import { getCategories } from "@/services/getCategories";
import { getPhotos } from "@/services/getPhotos";
import { TopCategories } from "./_components/TopCategories";
import { TopPhotos } from "./_components/TopPhotos";
import { TopUsers } from "./_components/TopUsers";
import styles from "./style.module.css";
import type { Metadata } from "next";

/**
 * metadata（静的メタデータ）
 *
 * - App Router では `export const metadata` を定義すると、
 *   そのページの <title> や description などのメタ情報を静的に設定できる。
 *
 * ここでは title だけを SITE_NAME にしている。
 *
 * アルゴリズム的な見方：
 * - ルート（ページ）に付随する “付加情報（メタデータ）” を
 *   レンダリング前に確定させ、HTML の head に反映する。
 *
 * ポイント：
 * - 静的メタデータは “データ取得に依存しない” ため高速で扱いやすい。
 * - 動的メタデータ（generateMetadata）と違い、毎回 fetch する必要がない。
 */
export const metadata: Metadata = {
  title: SITE_NAME,
};

/**
 * Page（トップページ）
 *
 * - `"use client"` が無いので Server Component として動作する。
 * - `async` にすることで、サーバ側でデータ取得してから HTML を生成できる。
 *
 * このページの役割：
 * - 最新投稿（photos）を取得して TopPhotos に渡す
 * - カテゴリ一覧（categories）を取得して TopCategories に渡す
 * - ユーザー一覧（仮：mock）を TopUsers に渡す
 * - レイアウトとして「メイン（写真）」と「サイドバー（カテゴリ/ユーザー）」に配置する
 *
 * アルゴリズム的な見方（データ取得→UIへの分配→レイアウト合成）：
 * 1. 写真一覧を取得（getPhotos）
 * 2. カテゴリ一覧を取得（getCategories）
 * 3. 取得したデータを、それぞれ担当コンポーネントへ “入力” として渡す
 * 4. CSS Modules のクラスで 2カラム構造（メイン + aside）に配置する
 *
 * 注意（性能面）：
 * - 現状は photos と categories を直列に await しているため、
 *   取得元が遅いと合計待ち時間が増える。
 * - 要件次第では Promise.all で並列化する余地がある。
 */
export default async function Page() {
  /**
   * photosData（写真一覧の取得結果）
   *
   * - getPhotos({}) は “条件なし” で写真一覧を取得する想定。
   * - 戻り値は `{ photos: Photo[] }` のような形を想定している。
   *
   * アルゴリズム的には：
   * - “トップページで使うメインデータ” を先に確定させる工程。
   */
  const photosData = await getPhotos({});

  /**
   * categoriesData（カテゴリ一覧の取得結果）
   *
   * - getCategories() はカテゴリ一覧を取得し、
   *   戻り値は `{ categories: Category[] }` のような形を想定している。
   *
   * アルゴリズム的には：
   * - “サイドバーに表示する共通データ” を確定させる工程。
   */
  const categoriesData = await getCategories();

  return (
    /**
     * styles.page（ページ全体のラッパー）
     *
     * - CSS Modules により、このページ専用のレイアウトスタイルを適用する。
     * - 典型的には grid/flex で “メイン + aside” の2カラム構造を作る。
     */
    <div className={styles.page}>
      {/**
       * メイン領域：最新投稿
       *
       * - styles.photos はメイン領域側の幅・余白・並びなどを制御する想定。
       * - TopPhotos は photos 配列を受け取り、カード一覧 + モーダルなどを構築する。
       *
       * `{...photosData}` はスプレッドで props 展開している。
       * - 例：photosData = { photos: [...] } の場合、
       *   TopPhotos に `photos={...}` が渡る（TopPhotos の Props 定義に依存）。
       *
       * アルゴリズム的には：
       * - “取得したデータ（photosData）” を “表示担当（TopPhotos）” へ委譲する工程。
       */
      <div className={styles.photos}>
        <TopPhotos {...photosData} />
      </div>

      {/**
       * サイドバー領域：カテゴリ + ユーザー
       *
       * - aside は補助情報（ナビゲーション的要素）を置くのに適した領域。
       * - styles.aside で縦積み・余白・固定幅などを制御する想定。
       */}
      <aside className={styles.aside}>
        {/**
         * TopCategories（カテゴリ一覧の表示）
         *
         * - categoriesData をスプレッドで渡すことで、
         *   TopCategories 側が期待する props（例：categories）を受け取れる。
         *
         * アルゴリズム的には：
         * - “カテゴリ一覧データ” を “カテゴリ表示UI” に変換する処理を
         *   TopCategories に委譲している。
         */}
        <TopCategories {...categoriesData} />

        {/**
         * TopUsers（ユーザー一覧の表示：仮実装）
         *
         * - 現状は @/_mock の users / profiles を直接渡している（🚧 なので仮）。
         * - 将来的には getUsers / getProfiles のようなサービス関数で取得して、
         *   ここに渡す形に置き換える想定。
         *
         * アルゴリズム的には：
         * - “ユーザー一覧データ（現状は mock）” を “ユーザー表示UI” に変換する処理を
         *   TopUsers に委譲している。
         */}
        {/* 🚧: ユーザー一覧を取得する */}
        <TopUsers users={users} profiles={profiles} />
      </aside>
    </div>
  );
}