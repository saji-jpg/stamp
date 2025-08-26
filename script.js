// ページの状態を管理する変数
let html5QrcodeScanner = null;
let currentScannedCodes = JSON.parse(localStorage.getItem('scannedCodes')) || [];
let isMessageBoxVisible = false; // メッセージボックスの表示状態を管理するフラグ

// QRコードの数を定義
const totalQRCodes = 5;

/**
 * 指定されたページを表示し、他のページを非表示にする関数。
 * @param {string} pageId - 表示するページのID。
 */
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');

    // QRページが表示されたらスキャナーを開始
    if (pageId === 'qr-page') {
        startQrScanner();
    } else {
        // 他のページに移動したらスキャナーを停止
        if (html5QrcodeScanner && html5QrcodeScanner.getState() !== 2) { // 2は停止状態を示す
            html5QrcodeScanner.stop().then(() => {
                console.log("QR code scanner stopped.");
            }).catch(err => {
                console.error("Failed to stop QR code scanner:", err);
            });
        }
    }
    updateStampGrid();
}

/**
 * メッセージボックスを表示する関数。
 * @param {string} message - 表示するメッセージ。
 */
function showMessageBox(message) {
    // メッセージボックスが表示されている場合は、新しいメッセージを表示しない
    if (isMessageBoxVisible) {
        return;
    }
    isMessageBoxVisible = true; // フラグを立てる

    document.getElementById('message-content').innerHTML = message;
    document.querySelector('.message-box-overlay').style.display = 'block';
    document.getElementById('message-box').style.display = 'flex';
    // メッセージボックスが表示されたらQRコードスキャナーを一時停止
    if (html5QrcodeScanner && html5QrcodeScanner.getState() === 1) { // 1はスキャン中
        html5QrcodeScanner.pause();
    }
}

// メッセージボックスを閉じる関数
function closeMessageBox() {
    isMessageBoxVisible = false; // フラグを元に戻す
    document.querySelector('.message-box-overlay').style.display = 'none';
    document.getElementById('message-box').style.display = 'none';
    // メッセージボックスが閉じたらQRコードスキャナーを再開
    if (html5QrcodeScanner && html5QrcodeScanner.getState() === 3) { // 3は一時停止中
        html5QrcodeScanner.resume();
    }
}

// スタンプの状態を更新する関数
function updateStampGrid() {
    const stampGridContainer = document.querySelector('#stamp-grid-container');
    stampGridContainer.innerHTML = '';
    const stamps = ['スタンプ1', 'スタンプ2', 'スタンプ3', 'スタンプ4', 'スタンプ5'];
    
    // 1行目の要素を作成
    const firstRow = document.createElement('div');
    firstRow.className = 'stamp-grid-row-top';

    // 1番目と2番目のスタンプを追加
    const stamp1 = createStampItem(stamps[0], 1);
    const stamp2 = createStampItem(stamps[1], 2);
    firstRow.appendChild(stamp1);
    firstRow.appendChild(stamp2);

    // 2行目の要素を作成
    const secondRow = document.createElement('div');
    secondRow.className = 'stamp-grid-row-bottom';
    
    // 3番目、4番目、5番目のスタンプを追加
    const stamp3 = createStampItem(stamps[2], 3);
    const stamp4 = createStampItem(stamps[3], 4);
    const stamp5 = createStampItem(stamps[4], 5);
    secondRow.appendChild(stamp3);
    secondRow.appendChild(stamp4);
    secondRow.appendChild(stamp5);

    // コンテナに各行を追加
    stampGridContainer.appendChild(firstRow);
    stampGridContainer.appendChild(secondRow);
}

/**
 * スタンプアイテムを生成するヘルパー関数。
 * @param {string} stampName - スタンプの名前。
 * @param {number} stampNumber - スタンプの番号。
 * @returns {HTMLElement} - 生成されたスタンプのDOM要素。
 */
function createStampItem(stampName, stampNumber) {
    const isStamped = currentScannedCodes.includes(`stamp-${stampNumber}`);
    const stampItem = document.createElement('div');
    stampItem.className = 'stamp-item';
    // スタンプが押されたらリボンの絵文字を表示
    stampItem.innerHTML = `
        <div class="stamp-status ${isStamped ? 'stamped' : ''}">
            ${isStamped ? '🎀' : (stampNumber)}
        </div>
        <div class="stamp-name">${stampName}</div>
    `;
    return stampItem;
}

// QRコードスキャナーを開始する関数
function startQrScanner() {
    // スキャナーが既に存在し、停止状態の場合は再開
    if (html5QrcodeScanner) {
        html5QrcodeScanner.start({ facingMode: "environment" }, {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        }, onScanSuccess, onScanFailure);
        return;
    }

    html5QrcodeScanner = new Html5Qrcode("reader");

    // カメラが利用可能か確認し、スキャナーを開始
    Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length) {
            const cameraId = devices[0].id;
            html5QrcodeScanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                onScanSuccess,
                onScanFailure
            );
        }
    }).catch(err => {
        console.error("Camera access failed:", err);
        showMessageBox("カメラへのアクセスに失敗しました。カメラの許可設定を確認してください。");
    });
}

/**
 * QRコードの読み取りに成功したときの処理。
 * @param {string} decodedText - 読み取られたQRコードのテキスト。
 * @param {object} decodedResult - 読み取り結果の詳細情報。
 */
function onScanSuccess(decodedText, decodedResult) {
    // メッセージボックスが表示されている場合は、処理を中断
    if (isMessageBoxVisible) {
        return;
    }

    console.log(`Code matched = ${decodedText}`, decodedResult);
    
    // スキャンしたコードがスタンプラリーの形式か確認
    const regex = /^stamp-[1-5]$/;
    if (!regex.test(decodedText)) {
        // 形式が一致しない場合は処理しない
        return;
    }

    // 既にスキャン済みか確認
    if (currentScannedCodes.includes(decodedText)) {
        // 既に取得済みの場合は処理しない
        return;
    }

    // スキャンしたコードを追加して保存
    currentScannedCodes.push(decodedText);
    localStorage.setItem('scannedCodes', JSON.stringify(currentScannedCodes));

    // スタンプの総数をチェック
    if (currentScannedCodes.length === totalQRCodes) {
        // すべてのスタンプを集めたらおめでとうページに移動
        showPage('congratulations-page');
    } else {
        // スタンプをゲットしたことをメッセージで通知
        showMessageBox(`スタンプをゲットしました！\n残り${totalQRCodes - currentScannedCodes.length}個です。`);
        // トップページに戻る
        showPage('home-page');
    }
}

/**
 * QRコードの読み取りに失敗したときの処理。
 * @param {string} error - 失敗した理由を示すエラーメッセージ。
 */
function onScanFailure(error) {
    // console.warn(`Code scan error = ${error}`);
}

// ページロード時にスタンプの状態を更新
document.addEventListener('DOMContentLoaded', () => {
    updateStampGrid();
});
