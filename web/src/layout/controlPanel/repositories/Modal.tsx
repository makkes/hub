import classnames from 'classnames';
import every from 'lodash/every';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useRef, useState } from 'react';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind, OptionWithIcon, RefInputField, Repository, RepositoryKind, ResourceKind } from '../../../types';
import compoundErrorMessage from '../../../utils/compoundErrorMessage';
import { RepoKindDef, REPOSITORY_KINDS } from '../../../utils/data';
import ExternalLink from '../../common/ExternalLink';
import InputField from '../../common/InputField';
import Modal from '../../common/Modal';
import SelectWithIcon from '../../common/SelectWithIcon';
import styles from './Modal.module.css';

interface FormValidation {
  isValid: boolean;
  repository: Repository | null;
}

interface Props {
  open: boolean;
  repository?: Repository;
  onSuccess?: () => void;
  onClose: () => void;
  onAuthError: () => void;
}
const DEFAULT_SELECTED_REPOSITORY_KIND = RepositoryKind.Helm;

const RepositoryModal = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const form = useRef<HTMLFormElement>(null);
  const nameInput = useRef<RefInputField>(null);
  const urlInput = useRef<RefInputField>(null);
  const [isSending, setIsSending] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const organizationName = ctx.prefs.controlPanel.selectedOrg;
  const [selectedKind, setSelectedKind] = useState<RepositoryKind>(
    isUndefined(props.repository) ? DEFAULT_SELECTED_REPOSITORY_KIND : props.repository.kind
  );

  // Clean API error when form is focused after validation
  const cleanApiError = () => {
    if (!isNull(apiError)) {
      setApiError(null);
    }
  };

  const onCloseModal = () => {
    props.onClose();
  };

  async function handleRepository(repository: Repository) {
    try {
      if (isUndefined(props.repository)) {
        await API.addRepository(repository, organizationName);
      } else {
        await API.updateRepository(repository, organizationName);
      }
      if (!isUndefined(props.onSuccess)) {
        props.onSuccess();
      }
      setIsSending(false);
      onCloseModal();
    } catch (err) {
      setIsSending(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        let error = compoundErrorMessage(
          err,
          `An error occurred ${isUndefined(props.repository) ? 'adding' : 'updating'} the repository`
        );

        if (!isUndefined(organizationName) && err.kind === ErrorKind.Forbidden) {
          error = `You do not have permissions to ${isUndefined(props.repository) ? 'add' : 'update'} the repository  ${
            isUndefined(props.repository) ? 'to' : 'from'
          } the organization.`;
        }

        setApiError(error);
      } else {
        props.onAuthError();
      }
    }
  }

  const submitForm = () => {
    cleanApiError();
    setIsSending(true);
    if (form.current) {
      validateForm(form.current).then((validation: FormValidation) => {
        if (validation.isValid && !isNull(validation.repository)) {
          handleRepository(validation.repository);
        } else {
          setIsSending(false);
        }
      });
    }
  };

  const validateForm = async (form: HTMLFormElement): Promise<FormValidation> => {
    let repository: Repository | null = null;

    return validateAllFields().then((isValid: boolean) => {
      if (isValid) {
        const formData = new FormData(form);
        repository = {
          kind: selectedKind,
          name: !isUndefined(props.repository) ? props.repository.name : (formData.get('name') as string),
          url: formData.get('url') as string,
          displayName: formData.get('displayName') as string,
        };
      }
      setIsValidated(true);
      return { isValid, repository };
    });
  };

  const validateAllFields = async (): Promise<boolean> => {
    return Promise.all([nameInput.current!.checkIsValid(), urlInput.current!.checkIsValid()]).then((res: boolean[]) => {
      return every(res, (isValid: boolean) => isValid);
    });
  };

  const handleOnReturnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' && !isNull(form)) {
      submitForm();
    }
  };

  const getActiveRepositoryKinds = (): OptionWithIcon[] => {
    const active = REPOSITORY_KINDS.filter((repoKind: RepoKindDef) => repoKind.active);

    return active.map((repoKind: RepoKindDef) => {
      return {
        value: repoKind.kind.toString(),
        label: repoKind.name,
        icon: <div className={styles.kindIcon}>{repoKind.icon}</div>,
      };
    });
  };

  const handleKindChange = (kind: string) => {
    setSelectedKind(parseInt(kind));
    // URL is validated when value has been entered previously
    if (urlInput.current!.getValue() !== '') {
      urlInput.current!.checkIsValid();
    }
  };

  const getAdditionalInfo = (): JSX.Element | undefined => {
    let link: JSX.Element;

    switch (selectedKind) {
      case RepositoryKind.Helm:
        link = (
          <ExternalLink
            href="https://github.com/artifacthub/hub/blob/master/docs/repositories.md#helm-charts-repositories"
            className="text-reset"
          >
            <u>Helm charts repositories</u>
          </ExternalLink>
        );
        break;
      case RepositoryKind.OLM:
        link = (
          <ExternalLink
            href="https://github.com/artifacthub/hub/blob/master/docs/repositories.md#olm-operators-repositories"
            className="text-reset"
          >
            <u>OLM operators repositories</u>
          </ExternalLink>
        );
        break;
      case RepositoryKind.Falco:
        link = (
          <ExternalLink
            href="https://github.com/artifacthub/hub/blob/master/docs/repositories.md#falco-rules-repositories"
            className="text-reset"
          >
            <u>Falco rules repositories</u>
          </ExternalLink>
        );
        break;
      case RepositoryKind.OPA:
        link = (
          <ExternalLink
            href="https://github.com/artifacthub/hub/blob/master/docs/repositories.md#opa-policies-repositories"
            className="text-reset"
          >
            <u>OPA policies repositories</u>
          </ExternalLink>
        );
        break;
    }

    return (
      <small className="text-muted text-break mt-1">
        <p className="mb-0">
          For more information about the url format and the repository structure, please see the {link} section in the{' '}
          <ExternalLink
            href="https://github.com/artifacthub/hub/blob/master/docs/repositories.md"
            className="text-reset"
          >
            <u>repositories guide</u>
          </ExternalLink>
          .
        </p>
      </small>
    );
  };

  const getURLPattern = (): string | undefined => {
    switch (selectedKind) {
      case RepositoryKind.Helm:
        return undefined;
      default:
        return '(https://(github|gitlab).com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)/?(.*)';
    }
  };

  return (
    <Modal
      header={
        <div className={`h3 m-2 ${styles.title}`}>
          {isUndefined(props.repository) ? <>Add repository</> : <>Update repository</>}
        </div>
      }
      open={props.open}
      modalClassName={styles.modal}
      closeButton={
        <button
          data-testid="repoBtn"
          className="btn btn-secondary"
          type="button"
          disabled={isSending}
          onClick={submitForm}
        >
          {isSending ? (
            <>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="ml-2">Validating repository...</span>
            </>
          ) : (
            <>{isUndefined(props.repository) ? <>Add</> : <>Update</>}</>
          )}
        </button>
      }
      onClose={onCloseModal}
      error={apiError}
      cleanError={cleanApiError}
    >
      <div className="w-100">
        <form
          data-testid="repoForm"
          ref={form}
          className={classnames('w-100', { 'needs-validation': !isValidated }, { 'was-validated': isValidated })}
          onFocus={cleanApiError}
          autoComplete="on"
          noValidate
        >
          <div className="form-group w-75 mb-2">
            <SelectWithIcon
              label="Kind"
              options={getActiveRepositoryKinds()}
              onChange={handleKindChange}
              selected={selectedKind.toString()}
              disabled={!isUndefined(props.repository)}
              required
            />
          </div>

          <InputField
            ref={nameInput}
            type="text"
            label="Name"
            labelLegend={<small className="ml-1 font-italic">(Required)</small>}
            name="name"
            value={!isUndefined(props.repository) ? props.repository.name : ''}
            readOnly={!isUndefined(props.repository)}
            invalidText={{
              default: 'This field is required',
              patternMismatch: 'Only lower case letters, numbers or hyphens. Must start with a letter',
              customError: 'There is another repository with this name',
            }}
            validateOnBlur
            checkAvailability={{
              isAvailable: true,
              resourceKind: ResourceKind.repositoryName,
              excluded: !isUndefined(props.repository) ? [props.repository.name] : [],
            }}
            pattern="[a-z][a-z0-9-]*"
            autoComplete="off"
            disabled={!isUndefined(props.repository)}
            required
          />

          <InputField
            type="text"
            label="Display name"
            name="displayName"
            value={
              !isUndefined(props.repository) && !isNull(props.repository.displayName)
                ? props.repository.displayName
                : ''
            }
          />

          <InputField
            ref={urlInput}
            type="url"
            label="Url"
            labelLegend={<small className="ml-1 font-italic">(Required)</small>}
            name="url"
            value={!isUndefined(props.repository) ? props.repository.url : ''}
            invalidText={{
              default: 'This field is required',
              typeMismatch: 'Please enter a valid url',
              patternMismatch: 'Please enter a valid reposiroty url for this repository kind',
              customError: 'There is another repository using this url',
            }}
            onKeyDown={handleOnReturnKeyDown}
            validateOnBlur
            checkAvailability={{
              isAvailable: true,
              resourceKind: ResourceKind.repositoryURL,
              excluded: !isUndefined(props.repository) ? [props.repository.url] : [],
            }}
            pattern={getURLPattern()}
            additionalInfo={getAdditionalInfo()}
            required
          />
        </form>
      </div>
    </Modal>
  );
};

export default RepositoryModal;
