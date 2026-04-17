"use client";

import { Layout, Menu, Avatar, Dropdown, Breadcrumb, Typography } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  SkinOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  AuditOutlined,
  DollarOutlined,
  SettingOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import type { MenuProps } from "antd";
import { useAuthStore } from "@/store/use-auth-store";

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

const menuItems: MenuProps["items"] = [
  { key: "/app/dashboard", icon: <DashboardOutlined />, label: "控制台" },
  { key: "/app/templates", icon: <UserOutlined />, label: "角色模板" },
  { key: "/app/outfits", icon: <SkinOutlined />, label: "穿搭任务" },
  { key: "/app/assets", icon: <PictureOutlined />, label: "资产库" },
  { key: "/app/reviews", icon: <AuditOutlined />, label: "审核" },
  { key: "/app/costs", icon: <DollarOutlined />, label: "成本统计" },
  { type: "divider" },
  { key: "/app/settings", icon: <SettingOutlined />, label: "系统设置" },
];

const breadcrumbMap: Record<string, string> = {
  "/app/dashboard": "控制台",
  "/app/templates": "角色模板",
  "/app/outfits": "穿搭任务",
  "/app/assets": "资产库",
  "/app/reviews": "审核",
  "/app/costs": "成本统计",
  "/app/settings": "系统设置",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user, fetchUser, logout } = useAuthStore();

  useEffect(() => {
    if (!user) fetchUser();
  }, [user, fetchUser]);

  const selectedKey =
    Object.keys(breadcrumbMap).find((k) => pathname.startsWith(k)) ||
    "/app/dashboard";

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const userMenu: MenuProps["items"] = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
    },
  ];

  const breadcrumbItems = [
    { title: "首页" },
    ...(breadcrumbMap[selectedKey]
      ? [{ title: breadcrumbMap[selectedKey] }]
      : []),
  ];

  const siderWidth = collapsed ? 80 : 220;

  return (
    <Layout className="min-h-dvh">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={220}
        collapsedWidth={80}
        theme="dark"
        style={{
          overflow: "auto",
          height: "100vh",
          position: "fixed",
          insetInlineStart: 0,
          top: 0,
          zIndex: 10,
        }}
      >
        <div className="flex h-14 items-center justify-center gap-2 border-b border-white/10">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: "rgba(201, 169, 110, 0.2)" }}
          >
            <VideoCameraOutlined style={{ color: "#c9a96e", fontSize: 16 }} />
          </div>
          {!collapsed && (
            <Text
              strong
              style={{ color: "#e8d5b0", fontSize: 14, whiteSpace: "nowrap" }}
            >
              AI 穿搭视频
            </Text>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
        />
      </Sider>
      <Layout
        className="flex min-h-dvh flex-1 flex-col"
        style={{ marginInlineStart: siderWidth, backgroundColor: "var(--color-bg)" }}
      >
        <Header
          className="flex shrink-0 items-center justify-between border-b border-border bg-white! px-6"
          style={{ height: 56, padding: "0 24px" }}
        >
          <Breadcrumb items={breadcrumbItems} />
          <Dropdown menu={{ items: userMenu }} placement="bottomRight">
            <div style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar
                size={32}
                icon={<UserOutlined />}
                style={{ backgroundColor: "#1a1a2e" }}
              />
              {user && (
                <Text style={{ fontSize: 13 }}>
                  {user.name || user.email}
                </Text>
              )}
            </div>
          </Dropdown>
        </Header>
        <Content className="min-h-0 flex-1 p-6">{children}</Content>
      </Layout>
    </Layout>
  );
}
