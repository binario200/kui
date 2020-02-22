/*
 * Copyright 2020 IBM Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as React from 'react'
import { REPL, KResponse, Tab as KuiTab, KeyCodes } from '@kui-shell/core'

import Width from './width'
import TitleBar from './TitleBar'

import '../../../web/css/static/sidecar.css'
import '../../../web/css/static/sidecar-main.css'

/**
 * In order to support a sidecar being managed from an enclosing
 * context, we offer these Props. By "managed", we mean the answer to
 * the question of which component should direct command execution
 * responses into the view? The Sidecar impls on their own could do
 * so. However, in some cases, it may be helpful to broker multiple
 * sidecar views into a single enclosing view. If so, then that
 * enclosing construct needs to manage the direction of responses into
 * the view. It will then direct that response intot he `response`
 * field here, and set `managed` to true. It may also pass down an
 * `onclose` and `willLoseFocus` event set, so that the enclosing
 * container may also manage those aspects of the view.
 *
 * For self-managed sidecar instances, these will likely be all null.
 *
 */
export interface Props<R extends KResponse> {
  tab?: KuiTab
  managed?: boolean
  onClose?: () => void
  response?: R
  willLoseFocus?: () => void
}

/** Mostly, this State deals with the current "width" of the view. */
export interface BaseState {
  /** Current presentation of the sidecar; e.g. Maximized or Minimized or Default width? */
  width: Width

  /**
   * To handle toggling: if the sidecar is Maximized, then *
   * toggle+toggle should return us to Maximized; whereas if the
   * sidecar is Default, then toggle+toggle should return us to
   * Default... `priorWidth` state helps us manage this effect.
   */
  priorWidth?: Width

  /** TODO investigate removing these */
  repl: REPL
  tab: KuiTab
}

type Cleaner = () => void

export abstract class BaseSidecar<R extends KResponse, State extends BaseState> extends React.PureComponent<
  Props<R>,
  State
> {
  protected cleaners: Cleaner[] = []

  protected constructor(props: Props<R>) {
    super(props)

    // interpret Escape key as a toggle of the view's width */
    const onEscape = this.onEscape.bind(this)
    document.addEventListener('keyup', onEscape)
    this.cleaners.push(() => document.removeEventListener('keyup', onEscape))
  }

  /** We are about to go away; invoke the register cleaners. */
  public componentWillUnmount() {
    this.cleaners.forEach(_ => _())
  }

  /** Escape key toggles sidecar visibility */
  private onEscape(evt: KeyboardEvent) {
    if (evt.keyCode === KeyCodes.ESCAPE) {
      this.setState(({ width: currentWidth, priorWidth }) => {
        if (priorWidth !== undefined) {
          return {
            width: priorWidth,
            priorWidth: undefined
          }
        } else {
          return {
            width: Width.Minimized,
            priorWidth: currentWidth
          }
        }
      })
    }
  }

  /** Is someone above us managing listening for KResponses */
  protected isManaged(): boolean {
    return !!this.props.managed
  }

  protected onMaximize() {
    this.setState({ width: Width.Maximized })
  }

  protected onRestore() {
    this.setState({ width: Width.Default })
  }

  protected onMinimize() {
    this.setState(({ width }) => {
      if (width === Width.Default && this.props.willLoseFocus) {
        this.props.willLoseFocus()
      }

      return {
        width: width === Width.Minimized ? Width.Default : Width.Minimized
      }
    })
  }

  protected onClose() {
    this.props.onClose()
  }

  protected isFixedWidth() {
    return false
  }

  protected width(): Required<string> {
    switch (this.state.width) {
      case Width.Minimized:
        return 'minimized'
      case Width.Maximized:
        return 'visible maximized'
      default:
        return 'visible'
    }
  }

  protected title(kind?: string, namespace?: string, fixedWidth = true, onClickNamespace?: () => void) {
    return (
      <TitleBar
        fixedWidth={fixedWidth}
        kind={kind}
        namespace={namespace}
        onClickNamespace={onClickNamespace}
        onScreenshot={this.state.repl ? () => this.state.repl.pexec('screenshot sidecar') : undefined}
        onMaximize={this.onMaximize.bind(this)}
        onRestore={this.onRestore.bind(this)}
        onMinimize={this.onMinimize.bind(this)}
        onClose={this.onClose.bind(this)}
      />
    )
  }
}

// we use customized tags since the body view doesn't use a React Component lifecycle for now
declare global {
  /* eslint-disable @typescript-eslint/no-namespace */
  namespace JSX {
    interface IntrinsicElements {
      sidecar: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    }
  }
}