import { prisma } from "../config/db.js";
import { hashPassword, comparePassword, generateToken } from "../utils/auth.js";

export async function registerUser(username: string, email:string,  password: string) {
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
        data:{
            username,
            email,
            password: hashedPassword
        }
    });

    const token = generateToken(user.id);
    return { user, token };
}

export async function loginUser(email: string, password: string) {
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if(!user){
        throw new Error("Invalid email or password");
    }

    const isVaild = await comparePassword(password, user.password);
    if(!isVaild){
        throw new Error("Invalid password");
    }

    const token = generateToken(user.id);
    return { user, token };

}