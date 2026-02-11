// src/components/RegisterPage.jsx
import React, {useEffect, useMemo, useState} from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';


type FormDataType = {
    cellphone: string;
    username: string;
    password: string;
    confirmPassword: string;
    organization?: string;
    invitationCode: string;
    email: string;
    age?: string;
    gender?: string;
    university?: string;
    major?: string;
    grade?: string;
};

type ErrorsType = Partial<Record<keyof FormDataType, string>>;
const RegisterPage = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: "",
        password: "",
        confirmPassword: "",
        cellphone: "",
        email: "",
        age: "",
        gender: "",
        university: "",
        major: "",
        grade: "",
        invitationCode: ""
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const validate = () => {
        const e: Record<string, string> = {};

        if (!form.username) e.username = "Username required";
        if (!form.password) e.password = "Password required";
        if (form.password !== form.confirmPassword)
            e.confirmPassword = "Passwords do not match";
        if (!/^\d{11}$/.test(form.cellphone))
            e.cellphone = "Cellphone must be 11 digits";
        if (!form.email) e.email = "Email required";

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate() || loading) return;

        setLoading(true);
        setMessage("");

        try {
            await window.api.register({
                username: form.username,
                password: form.password,
                email: form.email,
                cellphone: form.cellphone,
                role: "student",
                age: form.age,
                gender: form.gender,
                university: form.university,
                major: form.major,
                grade: form.grade
            });

            setMessage("Registration successful. Redirecting to login…");

            setTimeout(() => navigate("/login"), 1500);
        } catch (err: any) {
            setMessage(err.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
            <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-lg">
                <h2 className="text-2xl font-bold text-center text-indigo-600 mb-6">
                    Register an Account
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {[
                        ["Username*", "username", "text"],
                        ["Password*", "password", "password"],
                        ["Confirm Password*", "confirmPassword", "password"],
                        ["Cellphone*", "cellphone", "text"],
                        ["Email*", "email", "email"]
                    ].map(([label, name, type]) => (
                        <div key={name}>
                            <label className="block text-sm font-medium text-gray-700">
                                {label}
                            </label>
                            <input
                                type={type}
                                name={name}
                                value={(form as any)[name]}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                            />
                            {errors[name] && (
                                <p className="text-red-500 text-sm">{errors[name]}</p>
                            )}
                        </div>
                    ))}

                    {[
                        ["Age (optional)", "age"],
                        ["Gender (optional)", "gender"],
                        ["University (optional)", "university"],
                        ["Major (optional)", "major"],
                        ["Grade (optional)", "grade"]
                    ].map(([label, name]) => (
                        <div key={name}>
                            <label className="block text-sm font-medium text-gray-700">
                                {label}
                            </label>
                            <input
                                type="text"
                                name={name}
                                value={(form as any)[name]}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    ))}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-2 rounded-xl text-white transition ${
                            loading
                                ? "bg-gray-400"
                                : "bg-indigo-600 hover:bg-indigo-700"
                        }`}
                    >
                        {loading ? "Registering..." : "Register"}
                    </button>
                </form>

                {message && (
                    <p className="text-center text-sm mt-4 text-indigo-600">
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
};

export default RegisterPage;
