import { NextResponse } from "next/server";
import { AES, enc } from "crypto-js";

export async function POST(request) {
    try {
        const { encryptedPassword, secretKey } = await request.json();

        if (!encryptedPassword || !secretKey) {
            return NextResponse.json({
                success: false,
                message: 'Encrypted password and secret key are required'
            }, { status: 400 });
        }

        if (!secretKey) {
            return NextResponse.json({
                success: false,
                message: 'Secret key is required'
            }, { status: 400 });
        }

        // Decrypt the password using AES
        const bytes = AES.decrypt(encryptedPassword, secretKey);
        const decryptedPassword = bytes.toString(enc.Utf8);

        if (!decryptedPassword) {
            return NextResponse.json({
                success: false,
                message: 'Decryption failed - invalid encrypted password or secret key'
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: 'Password decrypted successfully',
            decryptedPassword: decryptedPassword
        }, { status: 200 });

    } catch (error) {
        console.error("Decryption error:", error);
        return NextResponse.json({
            success: false,
            message: 'Decryption failed: ' + error.message
        }, { status: 500 });
    }
}
