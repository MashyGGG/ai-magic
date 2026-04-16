'use client';

import { Button, Result } from 'antd';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Result
        status="404"
        title="页面不存在"
        subTitle="您访问的页面不存在"
        extra={
          <Button type="primary" onClick={() => router.push('/app/dashboard')}>
            返回控制台
          </Button>
        }
      />
    </div>
  );
}
