// @ts-nocheck
import React, {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import axiosInstance from "./axiosInstance";
const LoginPage = () => {
    const navigate = useNavigate();
    const [usernameOrEmail, setUsernameOrEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // AUTO-LOGIN on mount
    useEffect(() => {
        window.api.getSession().then((session) => {
            if (session?.user) {
                // redirect based on role
                if (session.user.role === "admin") navigate("/admin");
                else navigate("/dashboard");
            }
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        setError("");

        try {
            const res = await window.api.login({
                usernameOrEmail,
                password,
            });

            if (res.user.role === "admin") {
                navigate("/admin");
            } else {
                navigate("/dashboard");
            }
        } catch (err: any) {
            setError(err.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
            <div className="card w-full max-w-md shadow-xl bg-base-100">
                <div className="card-body space-y-4">
                    <h2 className="text-3xl font-bold text-primary text-center">
                        LATA
                    </h2>
                    <h5 className="text-primary text-center">
                        Tool for LLM-assisted Arabic Translation Annotation
                    </h5>
                    <p className="text-center text-sm text-base-content">
                        Welcome back! Please login.
                    </p>

                    {error && (
                        <div className="alert alert-error">
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Username or Email</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:bg-green-50"
                                placeholder="Enter your username or email"
                                value={usernameOrEmail}
                                onChange={(e) => setUsernameOrEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-control">
                            {/*<label className="label flex justify-between items-center">*/}
                            {/*    <span className="label-text">Password</span>*/}
                            {/*    <Link to="/forgetPassword" className="link link-primary text-sm">*/}
                            {/*        Forgot password?*/}
                            {/*    </Link>*/}
                            {/*</label>*/}
                            <input
                                type="password"
                                className="input input-bordered w-full focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:bg-green-50"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-control">
                            <button
                                className="btn btn-primary w-full"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm mr-2"></span>
                                        Logging in...
                                    </>
                                ) : (
                                    "Login"
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="divider">OR</div>

                    <div className="text-center mt-4">
                        <p className="text-sm">
                            Don’t have an account?{" "}
                            <Link to="/register" className="link link-primary font-semibold">
                                Register
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
