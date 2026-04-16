'use client';

import { Button, Result } from 'antd';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Result
      status="error"
      title="页面出错"
      subTitle={error.message || '页面加载失败，请稍后重试'}
      extra={
        <Button type="primary" onClick={reset}>
          重试
        </Button>
      }
    />
  );
}
