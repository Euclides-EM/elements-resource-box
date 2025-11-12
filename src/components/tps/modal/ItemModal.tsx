import { Feature, Item } from "../../../types";
import { StyledImage } from "../../common.ts";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalTextColumn,
  ModalTextContainer,
  ModalTitle,
  TextColumnsContainer,
} from "./ModalComponents.tsx";
import { lazy, Suspense } from "react";
import { openImage } from "../../../utils/dataUtils.ts";
import styled from "@emotion/styled";
import { HelpTip } from "../../map/Filter.tsx";
import {
  TOOLTIP_EN_TRANSLATION,
  TOOLTIP_TRANSCRIPTION,
} from "../../map/MapTooltips.tsx";
import { NotesEditor } from "./NotesEditor.tsx";
import { ItemInfo } from "./ItemInfo.tsx";
import { ITEM_EDIT_ROUTE } from "../../layout/routes.ts";

const HighlightedText = lazy(() => import("../features/HighlightedText.tsx"));

type ItemModalProps = {
  item: Item;
  features: Feature[] | null;
  onClose: () => void;
};

const StyledHelpTip = styled(HelpTip)<{
  marginLeft?: string;
  marginTop?: string;
}>`
  margin: 0 0 ${({ marginTop }) => marginTop || "0"}
    ${({ marginLeft }) => marginLeft || "-0.5rem"};
  z-index: 100;
`;

const NoTitlePage = styled.div`
  flex: 1;
  text-align: center;
  color: darkgray;
`;

const EditLink = styled.a`
  display: block;
  margin: 1rem;
  padding: 0.5rem 1rem;
  background-color: #f0f0f0;
  border-bottom: 1px solid #ddd;
  text-decoration: none;
  color: #333;
  font-weight: bold;
  text-align: center;

  &:hover {
    background-color: #e0e0e0;
  }
`;

const ItemModal = ({ item, features, onClose }: ItemModalProps) => {
  return (
    <Modal onClick={onClose}>
      <ModalContent
        onClick={(e) => e.stopPropagation()}
        hasImage={!!item.imageUrl}
      >
        {import.meta.env.DEV && (
          <EditLink href={`${ITEM_EDIT_ROUTE}?key=${item.key}`}>Edit</EditLink>
        )}
        <ModalClose title="Close" onClick={onClose}>
          ✕
        </ModalClose>
        {features && (
          <ItemInfo
            isRow={Boolean(item.imageUrl || (item.title && item.title !== "?"))}
            item={item}
          />
        )}
        <ModalTextContainer>
          {item.imageUrl && (
            <ModalTextColumn isImage>
              <StyledImage
                large
                clickable
                src={item.imageUrl}
                onClick={() => openImage(item)}
              />
            </ModalTextColumn>
          )}
          {features &&
            (item.title && item.title !== "?" ? (
              <TextColumnsContainer>
                <ModalTextColumn isTextContent>
                  <ModalTitle justifyStart gap={1}>
                    Original Text
                    <StyledHelpTip
                      tooltipId={TOOLTIP_TRANSCRIPTION}
                      marginTop="2px"
                    />
                  </ModalTitle>
                  <Suspense fallback={<div>{item.title}</div>}>
                    <HighlightedText
                      text={item.title}
                      features={features}
                      mapping={item.features}
                    />
                  </Suspense>
                  {item.imprint && (
                    <>
                      <hr style={{ opacity: 0.3 }} />
                      <Suspense fallback={<div>{item.imprint}</div>}>
                        <HighlightedText
                          text={item.imprint}
                          features={features}
                          mapping={item.features}
                        />
                      </Suspense>
                    </>
                  )}
                </ModalTextColumn>
                {(item.titleEn || item.imprintEn) && (
                  <ModalTextColumn isTextContent>
                    <ModalTitle justifyStart gap={1}>
                      English Translation{" "}
                      <StyledHelpTip
                        tooltipId={TOOLTIP_EN_TRANSLATION}
                        marginTop="2px"
                      />
                    </ModalTitle>
                    <Suspense fallback={<div>{item.titleEn || ""}</div>}>
                      <HighlightedText
                        text={item.titleEn || ""}
                        features={[]}
                        mapping={{}}
                      />
                    </Suspense>
                    {item.imprintEn && (
                      <>
                        {item.imprint && <hr style={{ opacity: 0.3 }} />}
                        <Suspense fallback={<div>{item.imprintEn}</div>}>
                          <HighlightedText
                            text={item.imprintEn}
                            features={[]}
                            mapping={{}}
                          />
                        </Suspense>
                      </>
                    )}
                  </ModalTextColumn>
                )}
              </TextColumnsContainer>
            ) : (
              <NoTitlePage>
                This edition has no title page or it is not available.
              </NoTitlePage>
            ))}
          {!features && <ItemInfo item={item} />}
        </ModalTextContainer>
        {import.meta.env.DEV && <NotesEditor item={item} />}
      </ModalContent>
    </Modal>
  );
};

export default ItemModal;
