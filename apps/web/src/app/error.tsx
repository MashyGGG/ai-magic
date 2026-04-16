"use client";

import { Button, Result } from "antd";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Result
        status="500"
        title="出错了"
        subTitle={error.message || "服务器遇到了问题，请稍后重试"}
        extra={
          <Button type="primary" onClick={reset}>
            重试
          </Button>
        }
      />
    </div>
  );
}
