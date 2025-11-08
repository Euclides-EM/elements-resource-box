import { useContext, useState, useRef, useEffect } from "react";
import styled from "@emotion/styled";
import { FaPlus, FaChevronDown } from "react-icons/fa";
import { MdLockPerson, MdLogout } from "react-icons/md";
import { css } from "@emotion/react";
import { AuthContext } from "../../contexts/Auth.ts";
import { AiFillEdit } from "react-icons/ai";

const DevButton = styled.button<{ mobile: boolean }>`
  background: #7f8c8d;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background-color 0.3s ease;
  position: relative;

  &:hover {
    background: #6c7b7d;
  }

  ${({ mobile }) =>
    mobile &&
    css`
      width: 100%;
      justify-content: center;
      margin-top: 0.5rem;
    `};
`;

const PopoverMenu = styled.div<{ mobile: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 150px;

  ${({ mobile }) =>
    mobile &&
    css`
      position: static;
      box-shadow: none;
      border: none;
      background: transparent;
      margin-top: 0.5rem;
    `};
`;

const PopoverMenuItem = styled.button<{ mobile: boolean }>`
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: white;
  color: #333;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;

  &:hover {
    background: #f5f5f5;
  }

  &:first-of-type {
    border-radius: 4px 4px 0 0;
  }

  &:last-of-type {
    border-radius: 0 0 4px 4px;
  }

  ${({ mobile }) =>
    mobile &&
    css`
      background: #7f8c8d;
      color: white;
      border-radius: 4px;
      margin-bottom: 0.5rem;

      &:hover {
        background: #6c7b7d;
      }

      &:first-of-type,
      &:last-of-type {
        border-radius: 4px;
      }
    `};
`;

const ActionsContainer = styled.div`
  position: relative;
`;

interface ActionsMenuProps {
  mobile: boolean;
  onShowCreateModal: () => void;
}

export const ActionsMenu = ({
  mobile,
  onShowCreateModal,
}: ActionsMenuProps) => {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const { token, setToken } = useContext(AuthContext);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setShowActionsMenu(false);
      }
    };

    if (showActionsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showActionsMenu]);

  return (
    <ActionsContainer ref={popoverRef}>
      <DevButton
        mobile={mobile}
        onClick={() => setShowActionsMenu(!showActionsMenu)}
      >
        <AiFillEdit />
        Editor Options
        <FaChevronDown />
      </DevButton>
      {showActionsMenu && (
        <PopoverMenu mobile={mobile}>
          {token ? (
            <>
              <PopoverMenuItem
                mobile={mobile}
                onClick={() => {
                  onShowCreateModal();
                  setShowActionsMenu(false);
                }}
              >
                <FaPlus />
                Add Edition
              </PopoverMenuItem>
              <PopoverMenuItem mobile={mobile} onClick={() => setToken(null)}>
                <MdLogout />
                Logout
              </PopoverMenuItem>
            </>
          ) : (
            <PopoverMenuItem
              mobile={mobile}
              onClick={() => {
                const t = prompt("Enter your token");
                if (t) {
                  setToken(t);
                }
              }}
            >
              <MdLockPerson />
              Login
            </PopoverMenuItem>
          )}
        </PopoverMenu>
      )}
    </ActionsContainer>
  );
};
