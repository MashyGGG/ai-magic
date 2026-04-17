"use client";

import {
  Drawer,
  Descriptions,
  Tag,
  Skeleton,
  Empty,
  List,
  Typography,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

const { Text } = Typography;

interface Props {
  templateId: string | null;
  onClose: () => void;
}

export function TemplateDetailDrawer({ templateId, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["template", templateId],
    queryFn: () =>
      api.get(`/api/character-templates/${templateId}`).then((r) => r.data.data),
    enabled: !!templateId,
  });

  return (
    <Drawer
      title="模板详情"
      open={!!templateId}
      onClose={onClose}
      size="large"
      forceRender
    >
      {isLoading ? (
        <Skeleton active />
      ) : !data ? (
        <Empty />
      ) : (
        <>
          {data.referenceAsset?.storageKey && (
            <div className="mb-4 overflow-hidden rounded-lg bg-gray-50">
              <img
                src={`/api/assets/${data.referenceAsset.id}/url`}
                alt="参考图"
                className="mx-auto max-h-60 object-contain"
              />
            </div>
          )}

          <Descriptions
            column={1}
            bordered
            size="small"
            items={[
              { label: "名称", children: data.name },
              { label: "描述", children: data.description || "-" },
              { label: "性别风格", children: data.genderStyle || "-" },
              { label: "年龄感", children: data.ageStyle || "-" },
              { label: "脸型", children: data.faceDesc || "-" },
              { label: "发型", children: data.hairDesc || "-" },
              { label: "肤色", children: data.skinDesc || "-" },
              { label: "身材", children: data.bodyDesc || "-" },
              { label: "气质", children: data.vibeDesc || "-" },
              { label: "默认镜头", children: <Tag>{data.defaultCamera || "未设置"}</Tag> },
              { label: "默认动作", children: <Tag>{data.defaultMotion || "未设置"}</Tag> },
              { label: "默认场景", children: <Tag>{data.defaultScene || "未设置"}</Tag> },
            ]}
          />

          {data.outfits?.length > 0 && (
            <div className="mt-4">
              <Text strong>关联穿搭任务</Text>
              <List
                size="small"
                dataSource={data.outfits}
                renderItem={(outfit: {
                  id: string;
                  title: string;
                  status: string;
                }) => (
                  <List.Item>
                    <Text>{outfit.title}</Text>
                    <Tag>{outfit.status}</Tag>
                  </List.Item>
                )}
              />
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}
