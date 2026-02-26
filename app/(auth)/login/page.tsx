'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, Input, Button, message } from 'antd';
import { login, register, sendCode, LoginRequest, RegisterRequest, AuthResponse } from '@/lib/api';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const redirect = searchParams.get('redirect') || '/chat';

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    try {
      const email = registerForm.getFieldValue('email');
      if (!email) {
        messageApi.error('请输入邮箱');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        messageApi.error('请输入有效的邮箱地址');
        return;
      }

      setLoading(true);
      await sendCode(email);
      messageApi.success('验证码已发送');
      startCountdown();
    } catch (error) {
      messageApi.error('发送失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (values: any) => {
    try {
      setLoading(true);

      const loginData: LoginRequest = {
        email: values.email,
        password: values.password,
      };

      const res = await login(loginData);
      const token = (res as unknown as AuthResponse).tokenValue;
      const userInfoData = (res as unknown as AuthResponse).userInfo;

      localStorage.setItem('authToken', token);
      localStorage.setItem('userInfo', JSON.stringify(userInfoData));
      document.cookie = `authToken=${token}; path=/; max-age=604800; sameSite=lax`;

      router.replace(redirect);
    } catch (error) {
      messageApi.error('登录失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: any) => {
    try {
      setLoading(true);

      const registerData: RegisterRequest = {
        email: values.email,
        pwd: values.password,
        captcha: values.captcha,
      };

      if (values.inviteCode) {
        registerData.inviteCode = values.inviteCode;
      }

      await register(registerData);
      messageApi.success('注册成功，请登录');
      setIsLogin(true);
      registerForm.resetFields();
    } catch (error) {
      messageApi.error('注册失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    loginForm.resetFields();
    registerForm.resetFields();
  };

  return (
    <div className={styles.container}>
      {contextHolder}

      {/* 主内容区 */}
      <div className={styles.content}>
        {/* 标题区 */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            {isLogin ? '登录' : '注册'} Chat Studio
          </h1>
          <p className={styles.subtitle}>
            👋 欢迎！请{isLogin ? '登录' : '注册'}以开始使用。
          </p>
        </div>

        {/* 登录表单 */}
        {isLogin && (
          <Form
            form={loginForm}
            layout="vertical"
            onFinish={handleLogin}
            className={styles.form}
          >
            <Form.Item
              name="email"
              label="邮箱"
              rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式错误' }]}
              className={styles.formItem}
            >
              <Input
                placeholder="输入邮箱地址"
                className={styles.input}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
              className={styles.formItem}
            >
              <Input.Password
                placeholder="输入密码"
                className={styles.input}
              />
            </Form.Item>

            <Form.Item className={styles.submitItem}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className={styles.submitButton}
              >
                登录
              </Button>
            </Form.Item>
          </Form>
        )}

        {/* 注册表单 */}
        {!isLogin && (
          <Form
            form={registerForm}
            layout="vertical"
            onFinish={handleRegister}
            className={styles.form}
          >
            <Form.Item
              name="email"
              label="邮箱"
              rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式错误' }]}
              className={styles.formItem}
            >
              <Input
                placeholder="输入邮箱地址"
                className={styles.input}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '至少6位' }]}
              className={styles.formItem}
            >
              <Input.Password
                placeholder="设置密码"
                className={styles.input}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="确认密码"
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('密码不一致'));
                  },
                }),
              ]}
              className={styles.formItem}
            >
              <Input.Password
                placeholder="确认密码"
                className={styles.input}
              />
            </Form.Item>

            <Form.Item
              label="验证码"
              required
              className={styles.formItem}
            >
              <div className={styles.captchaRow}>
                <Form.Item
                  name="captcha"
                  noStyle
                  rules={[{ required: true, message: '请输入验证码' }]}
                >
                  <Input
                    placeholder="输入验证码"
                    className={`${styles.input} ${styles.captchaInput}`}
                  />
                </Form.Item>
                <Button
                  onClick={handleSendCode}
                  loading={loading}
                  disabled={countdown > 0}
                  className={styles.codeButton}
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </Button>
              </div>
            </Form.Item>

            <Form.Item className={styles.submitItem}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className={styles.submitButton}
              >
                注册
              </Button>
            </Form.Item>
          </Form>
        )}

        {/* 切换链接 */}
        <div className={styles.footer}>
          <div className={styles.switchSection}>
            {isLogin ? '还没有账号？' : '已有账号？'}
            <button className={styles.switchLink} onClick={switchMode}>
              {isLogin ? '立即注册' : '立即登录'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
