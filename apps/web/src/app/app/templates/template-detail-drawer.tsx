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

const { Text } = Typography;

interface Props {
  templateId: string | null;
  onClose: () => void;
}

export function TemplateDetailDrawer({ templateId, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["template", templateId],
    queryFn: async () => {
      const res = await fetch(`/api/character-templates/${templateId}`);
      const json = await res.json();
      return json.data;
    },
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

          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="名称">{data.name}</Descriptions.Item>
            <Descriptions.Item label="描述">
              {data.description || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="性别风格">
              {data.genderStyle || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="年龄感">
              {data.ageStyle || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="脸型">
              {data.faceDesc || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="发型">
              {data.hairDesc || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="肤色">
              {data.skinDesc || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="身材">
              {data.bodyDesc || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="气质">
              {data.vibeDesc || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="默认镜头">
              <Tag>{data.defaultCamera || "未设置"}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="默认动作">
              <Tag>{data.defaultMotion || "未设置"}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="默认场景">
              <Tag>{data.defaultScene || "未设置"}</Tag>
            </Descriptions.Item>
          </Descriptions>

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
