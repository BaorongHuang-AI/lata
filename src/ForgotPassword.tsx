import { Key, Lock, User } from 'lucide-react'
import { useState } from 'react'

export default function ForgotPassword() {
    const [username, setUsername] = useState('')
    const [token, setToken] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [step, setStep] = useState<'request' | 'reset'>('request')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)

    // const handleSendToken = async () => {
    //     setLoading(true)
    //     setMessage('')
    //     try {
    //         setMessage('Token has been sent to your email.')
    //         setStep('reset')
    //     } catch (error: any) {
    //         setMessage(error?.response?.data?.message || 'Failed to send token.')
    //     } finally {
    //         setLoading(false)
    //     }
    // }

    const handleResetPassword = async () => {
        setLoading(true)
        setMessage('')
        try {
            const result = await window.api.resetPasswordByEmail(
                "demo@example.com"
            );

            if (!result.success) {
                setMessage(result.message);
                return;
            }

            // message.success(
            //     `Password reset for ${result.userName} (123456)`
            // );
            setMessage('Password has been reset to 123456!')
            setStep('request') // Optional: reset form
            setTimeout(() => {
                window.location.href = '/login'; // or use router.push('/login') if using react-router or next/router
            }, 3000);
        } catch (error: any) {
            setMessage(error?.response?.data || 'Reset failed.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold text-center mb-4">Reset Password</h2>

                {/* Username section */}
                <div className="space-y-4">
                    <label className="form-control">
                        <div className="label">
                            <span className="label-text">Username</span>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                className="input input-bordered w-full pl-10"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={step === 'reset'}
                            />
                            <User className="absolute left-3 top-3 text-gray-400" size={20} />
                        </div>
                    </label>

                    {step === 'request' && (
                        <button
                            className={`btn btn-primary w-full ${loading ? 'loading' : ''}`}
                            onClick={handleResetPassword}
                            disabled={!username}
                        >
                           Reset
                        </button>
                    )}
                </div>

                {/* Message display */}
                {message && (
                    <p className="text-sm text-center mt-4 text-info">{message}</p>
                )}
            </div>
        </div>
    )
}
