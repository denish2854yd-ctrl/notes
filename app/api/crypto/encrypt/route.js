import { NextResponse } from "next/server";
import { AES, enc } from "crypto-js";

export async function POST(request) {
    try {
        const { password, secretKey } = await request.json();

        if (!password || !secretKey) {
            return NextResponse.json({
                success: false,
                message: 'Password and secret key are required'
            }, { status: 400 });
        }

        if (!secretKey) {
            return NextResponse.json({
                success: false,
                message: 'Secret key is required'
            }, { status: 400 });
        }

        // Encrypt the password using AES
        const encryptedPassword = AES.encrypt(password, secretKey).toString();

        return NextResponse.json({
            success: true,
            message: 'Password encrypted successfully',
            encryptedPassword: encryptedPassword
        }, { status: 200 });

    } catch (error) {
        console.error("Encryption error:", error);
        return NextResponse.json({
            success: false,
            message: 'Encryption failed: ' + error.message
        }, { status: 500 });
    }
}
