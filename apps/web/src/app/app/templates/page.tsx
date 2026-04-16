"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Typography,
  Button,
  Input,
  Card,
  Row,
  Col,
  Tag,
  Empty,
  Skeleton,
  Pagination,
  App,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import dynamic from "next/dynamic";

const TemplateFormDrawer = dynamic<{
  open: boolean;
  editId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}>(
  () => import("./template-form-drawer").then((mod) => mod.TemplateFormDrawer),
  { ssr: false },
);

const TemplateDetailDrawer = dynamic<{
  templateId: string | null;
  onClose: () => void;
}>(
  () =>
    import("./template-detail-drawer").then((mod) => mod.TemplateDetailDrawer),
  { ssr: false },
);

const { Title } = Typography;

interface TemplateItem {
  id: string;
  name: string;
  genderStyle?: string;
  defaultCamera?: string;
  defaultMotion?: string;
  referenceAsset?: { id: string; storageKey: string } | null;
  createdAt: string;
}

async function fetchTemplates(page: number, pageSize: number, keyword: string) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (keyword) params.set("keyword", keyword);
  const res = await fetch(`/api/character-templates?${params}`);
  return res.json();
}

async function deleteTemplate(id: string) {
  const res = await fetch(`/api/character-templates/${id}`, {
    method: "DELETE",
  });
  return res.json();
}

export default function TemplatesPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["templates", page, keyword],
    queryFn: () => fetchTemplates(page, 12, keyword),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: (res) => {
      if (res.success) {
        message.success("删除成功");
        queryClient.invalidateQueries({ queryKey: ["templates"] });
      } else {
        message.error(res.error?.message || "删除失败");
      }
    },
  });

  const items: TemplateItem[] = data?.data?.items || [];
  const total = data?.data?.total || 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Title level={3} style={{ margin: 0 }}>
          角色模板
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditId(null);
            setFormOpen(true);
          }}
        >
          新建模板
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="搜索模板名称..."
          prefix={<SearchOutlined />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onPressEnter={() => {
            setKeyword(searchValue);
            setPage(1);
          }}
          allowClear
          onClear={() => {
            setKeyword("");
            setPage(1);
          }}
          style={{ maxWidth: 320 }}
        />
      </div>

      {isLoading ? (
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4].map((i) => (
            <Col key={i} xs={24} sm={12} md={8} lg={6}>
              <Card>
                <Skeleton active />
              </Card>
            </Col>
          ))}
        </Row>
      ) : items.length === 0 ? (
        <Empty description="还没有角色模板">
          <Button
            type="primary"
            onClick={() => {
              setEditId(null);
              setFormOpen(true);
            }}
          >
            立即创建
          </Button>
        </Empty>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {items.map((item) => (
              <Col key={item.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  className="transition-shadow hover:shadow-md"
                  cover={
                    item.referenceAsset ? (
                      <div className="flex h-40 items-center justify-center overflow-hidden bg-gray-100">
                        <img
                          src={`/api/assets/${item.referenceAsset.id}/url`}
                          alt={item.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex h-40 items-center justify-center bg-gray-50 text-gray-300">
                        <span className="text-4xl">👤</span>
                      </div>
                    )
                  }
                  actions={[
                    <EyeOutlined
                      key="view"
                      onClick={() => setDetailId(item.id)}
                    />,
                    <EditOutlined
                      key="edit"
                      onClick={() => {
                        setEditId(item.id);
                        setFormOpen(true);
                      }}
                    />,
                    <Popconfirm
                      key="del"
                      title="确定删除？"
                      onConfirm={() => deleteMutation.mutate(item.id)}
                    >
                      <DeleteOutlined />
                    </Popconfirm>,
                  ]}
                >
                  <Card.Meta
                    title={item.name}
                    description={
                      <div className="flex flex-wrap gap-1">
                        {item.genderStyle && <Tag>{item.genderStyle}</Tag>}
                        {item.defaultCamera && (
                          <Tag color="blue">{item.defaultCamera}</Tag>
                        )}
                        {item.defaultMotion && (
                          <Tag color="green">{item.defaultMotion}</Tag>
                        )}
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
          {total > 12 && (
            <div className="mt-6 flex justify-end">
              <Pagination
                current={page}
                total={total}
                pageSize={12}
                onChange={setPage}
                showSizeChanger={false}
              />
            </div>
          )}
        </>
      )}

      <TemplateFormDrawer
        open={formOpen}
        editId={editId}
        onClose={() => setFormOpen(false)}
        onSuccess={() => {
          setFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ["templates"] });
        }}
      />

      <TemplateDetailDrawer
        templateId={detailId}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
