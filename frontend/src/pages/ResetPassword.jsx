import React, { useState } from 'react';
import axios from 'axios';
import { Button, Alert, Input, Typography, Result } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function ResetPassword() {
    const { uid, token } = useParams();
    const navigate       = useNavigate();

    const [password,  setPassword]  = useState('');
    const [confirm,   setConfirm]   = useState('');
    const [loading,   setLoading]   = useState(false);
    const [error,     setError]     = useState('');
    const [success,   setSuccess]   = useState(false);

    const handleSubmit = async () => {
        setError('');
        if (password.length < 6) {
            setError('A palavra-passe deve ter pelo menos 6 caracteres.');
            return;
        }
        if (password !== confirm) {
            setError('As palavras-passe não coincidem.');
            return;
        }

        setLoading(true);
        try {
            const r = await axios.post('/api/password-reset/confirm/', {
                uid,
                token,
                new_password: password
            });
            if (r.data.status === 'success') {
                setSuccess(true);
            } else {
                setError(r.data.title);
            }
        } catch (e) {
            setError(e.response?.data?.title || 'Link inválido ou expirado. Solicite um novo.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2027 50%, #203a43 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <div style={{
                    background: '#fff', borderRadius: 16, padding: '48px 40px',
                    width: '100%', maxWidth: 420, boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
                }}>
                    <Result
                        status="success"
                        title="Palavra-passe alterada!"
                        subTitle="Pode agora fazer login com a nova palavra-passe."
                        extra={
                            <Button
                                type="primary"
                                size="large"
                                block
                                onClick={() => navigate('/app/login', { replace: true })}
                                style={{
                                    height: 48, borderRadius: 8,
                                    background: '#4F46E5', borderColor: '#4F46E5', fontWeight: 700
                                }}
                            >
                                Ir para o Login
                            </Button>
                        }
                    />
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2027 50%, #203a43 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
            <div style={{
                background: '#fff', borderRadius: 16, padding: '48px 40px',
                width: '100%', maxWidth: 420, boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
            }}>
                {/* Ícone */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16,
                        background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 12px', boxShadow: '0 4px 12px rgba(79,70,229,0.3)'
                    }}>
                        <LockOutlined style={{ color: '#fff', fontSize: 24 }} />
                    </div>
                    <Title level={3} style={{ margin: 0 }}>Nova palavra-passe</Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        Defina a sua nova palavra-passe de acesso ao Portal RH.
                    </Text>
                </div>

                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        closable
                        onClose={() => setError('')}
                        style={{ marginBottom: 16, borderRadius: 8 }}
                    />
                )}

                <div style={{ marginBottom: 12 }}>
                    <label style={{
                        fontSize: 11, fontWeight: 700, color: '#666',
                        textTransform: 'uppercase', display: 'block', marginBottom: 4
                    }}>
                        Nova palavra-passe
                    </label>
                    <Input.Password
                        prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                        placeholder="Mínimo 6 caracteres"
                        size="large"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={{ borderRadius: 8 }}
                    />
                </div>

                <div style={{ marginBottom: 24 }}>
                    <label style={{
                        fontSize: 11, fontWeight: 700, color: '#666',
                        textTransform: 'uppercase', display: 'block', marginBottom: 4
                    }}>
                        Confirmar palavra-passe
                    </label>
                    <Input.Password
                        prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                        placeholder="Repetir palavra-passe"
                        size="large"
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        onPressEnter={handleSubmit}
                        style={{ borderRadius: 8 }}
                    />
                    {password && confirm && password !== confirm && (
                        <Text type="danger" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                            As palavras-passe não coincidem
                        </Text>
                    )}
                </div>

                <Button
                    type="primary"
                    size="large"
                    block
                    loading={loading}
                    onClick={handleSubmit}
                    disabled={!password || !confirm || password !== confirm || password.length < 6}
                    style={{
                        height: 48, borderRadius: 8,
                        background: '#4F46E5', borderColor: '#4F46E5',
                        fontWeight: 700, fontSize: 15
                    }}
                >
                    Alterar palavra-passe
                </Button>
            </div>
        </div>
    );
}