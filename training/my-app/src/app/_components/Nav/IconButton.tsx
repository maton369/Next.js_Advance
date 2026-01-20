"use client"; // ★: 不要な "use client"（ただし onClick を受け取って button に渡す時点で、このコンポーネントは実質クライアント実行が前提になりやすい）

import styles from "./style.module.css";

type Props = {
  /**
   * onClick（クリック時に実行する関数）
   *
   * - 親コンポーネントから渡されるイベントハンドラ。
   * - この IconButton 自体は「何をするか」を知らず、クリックされたら onClick を呼ぶだけ。
   * - つまり「見た目（ボタン）と振る舞い（クリック時の処理）を分離」するためのAPIになっている。
   *
   * アルゴリズム的な見方：
   * - 入力：onClick（関数）
   * - 出力：クリックイベント発生時に onClick を実行する
   * - IconButton は “イベントを中継する” 役割に徹している。
   */
  onClick: () => void;

  /**
   * children（ボタン内部に表示する内容）
   *
   * - アイコン（SVG）やテキストなど、任意の React ノードを受け取れるようにしている。
   * - これにより「アイコンボタン」として汎用に使える。
   *
   * 例：
   * - <IconButton onClick={...}><SomeIcon /></IconButton>
   * - <IconButton onClick={...}>保存</IconButton>
   */
  children: React.ReactNode;
};

/**
 * IconButton（汎用ボタン部品）
 *
 * 目的：
 * - 見た目（style.module.css）を共通化しつつ、クリック時の処理は外から注入できるようにする。
 *
 * 実行モデルについて（"use client" が不要かどうか）：
 * - Next.js App Router ではデフォルトが Server Component だが、
 *   DOMイベント（onClick）を扱うのはクライアント側の仕事である。
 * - そのため、このコンポーネントが「実際にクリック可能なボタン」として振る舞うには、
 *   最終的にクライアントバンドル上でイベントが有効化（水和）される必要がある。
 *
 * よくある整理：
 * - “このファイル単体では state や hook を使っていないから Server でもよさそう” と思いがちだが、
 *   props に onClick（関数）を受け取る時点で、サーバ→クライアント境界を跨いで
 *   関数を受け渡すことはできないため、実用上は Client Component 化される設計になりやすい。
 *
 * つまり：
 * - コメントの「不要な use client」は、もし IconButton を純粋な見た目部品として使い、
 *   onClick を持たない（または <Link> 等で遷移だけする）用途なら成り立つ。
 * - しかし「onClick を props で受けて button に渡す」設計のままなら、
 *   クライアント側で動く前提が強いので "use client" は現実的には必要になりやすい。
 */
export function IconButton({ onClick, children }: Props) {
  return (
    /**
     * <button> 要素
     *
     * - className に CSS Modules の styles.button を指定し、
     *   見た目（サイズ、余白、hover、角丸など）を統一する。
     *
     * - onClick に props の onClick をそのまま渡している。
     *   これにより IconButton はクリックイベントを受けて、親が渡した処理を実行できる。
     *
     * アルゴリズム的な見方：
     * - ブラウザでクリックイベント発生
     * - React が onClick ハンドラを呼び出す
     * - IconButton は受け取った onClick を実行する（中継）
     */
    <button className={styles.button} onClick={onClick}>
      {/**
       * children をそのまま描画することで、ボタンの中身を柔軟に差し替えられる。
       * - “IconButton” という名前通り、アイコン（SVG）を入れる用途に向く。
       */}
      {children}
    </button>
  );
}