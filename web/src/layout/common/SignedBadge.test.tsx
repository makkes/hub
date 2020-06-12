import { render } from '@testing-library/react';
import React from 'react';

import SignedBadge from './SignedBadge';

describe('SignedBadge', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<SignedBadge packageKind={0} signed />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders label for Chart package', () => {
    const { getByTestId, getByText, getByRole } = render(<SignedBadge packageKind={0} signed />);
    expect(getByTestId('signedBadge')).toBeInTheDocument();
    expect(getByText('Signed')).toBeInTheDocument();
    expect(getByText('This chart has a provenance file')).toBeInTheDocument();
    expect(getByRole('tooltip')).toBeInTheDocument();
  });

  it('renders label for not Chart package', () => {
    const { getByTestId, getByText, queryByText, queryByRole } = render(<SignedBadge packageKind={1} signed />);
    expect(getByTestId('signedBadge')).toBeInTheDocument();
    expect(getByText('Signed')).toBeInTheDocument();
    expect(queryByText('This chart has a provenance file')).toBeNull();
    expect(queryByRole('tooltip')).toBeNull();
  });

  it('does not render label', () => {
    const { container } = render(<SignedBadge packageKind={0} signed={false} />);
    expect(container).toBeEmpty();
  });
});